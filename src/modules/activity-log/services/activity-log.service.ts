import { Injectable, Logger } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { validateSync } from 'class-validator'
import { Prisma } from '@runtime/prisma-client'
import { EnumActivityLogAction } from '../enums/activity-log.enum'
import { EnumAuthScopeType } from 'lib/nest-auth'
import { ScopeContext } from 'lib/nest-core'
import { IPrismaExportOptions, IPrismaReturnPaging, PrismaService } from 'lib/nest-prisma'
import { ACTIVITY_LOG_STAGE_KEY } from '../constants/activity-log.constant'
import { ActivityLogActionContract } from '../contracts/activity-log.action.contract'
import { EnumActivityLogOwner } from '../enums/activity-log.enum'
import { ActivityLogContractInvalidException } from '../exceptions/activity-log.contract-invalid.exception'
import { ActivityLogUtil } from '../helpers/activity-log.util'
import {
  IActivityLogActionContract,
  IActivityLogFlushOptions,
  IActivityLogMetadata,
  IActivityLogPrepareInput,
  IActivityLogRequestInfo,
  IActivityLogStagedEvent,
} from '../interfaces/activity-log.interface'

/**
 * Records user behaviour. Callers follow one order:
 *   1. `prepare` every event (validates contract + metadata, throws before anything commits)
 *   2. do the write
 *   3. `stagePrepared(events)`
 * `ActivityLogInterceptor` flushes the staged events once the handler settles.
 */
@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogUtil: ActivityLogUtil,
  ) {}

  prepare(input: IActivityLogPrepareInput): IActivityLogStagedEvent {
    const contract = this.getContract(input.action)
    const metadata = this.validateMetadata(input.action, contract, input.metadata ?? {})
    this.assertOwnerFields(input, contract.owner)

    return {
      action: input.action,
      metadata,
      onError: input.onError === true,
      ...(input.userId !== undefined ? { userId: input.userId } : {}),
      ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
      ...(input.createdBy !== undefined ? { createdBy: input.createdBy } : {}),
    }
  }

  stagePrepared(events: IActivityLogStagedEvent[]): void {
    if (!events.length) {
      return
    }
    const staged = ScopeContext.getStoreValue<IActivityLogStagedEvent[]>(ACTIVITY_LOG_STAGE_KEY)
    const stored = ScopeContext.setStoreValue(ACTIVITY_LOG_STAGE_KEY, [
      ...(staged ?? []),
      ...events,
    ])
    if (!stored) {
      // Only HTTP requests carry a request store; jobs and CLI commands have nothing to flush
      this.logger.warn(
        `Activity log staged outside an HTTP request, dropped: ${events.map(e => e.action).join(', ')}`,
      )
    }
  }

  async flushStaged({ isError, request }: IActivityLogFlushOptions): Promise<void> {
    const staged = ScopeContext.getStoreValue<IActivityLogStagedEvent[]>(ACTIVITY_LOG_STAGE_KEY)
    ScopeContext.setStoreValue(ACTIVITY_LOG_STAGE_KEY, [])
    if (!staged?.length) {
      return
    }

    const events = isError ? staged.filter(event => event.onError) : staged
    if (!events.length) {
      return
    }

    const rows = events.map(event => this.buildRow(event, request))
    // One statement: all rows of the request are written atomically
    await this.prisma.activityLog.createMany({ data: rows })
  }

  async getPageByUser(
    userId: number,
    kwargs: Prisma.ActivityLogFindManyArgs,
    options?: IPrismaExportOptions,
  ): Promise<IPrismaReturnPaging> {
    return this.getPage({ ...kwargs, where: { ...kwargs.where, userId } }, options)
  }

  async getPageByCustomer(
    customerId: number,
    kwargs: Prisma.ActivityLogFindManyArgs,
    options?: IPrismaExportOptions,
  ): Promise<IPrismaReturnPaging> {
    return this.getPage({ ...kwargs, where: { ...kwargs.where, customerId } }, options)
  }

  private async getPage(
    kwargs: Prisma.ActivityLogFindManyArgs,
    options?: IPrismaExportOptions,
  ): Promise<IPrismaReturnPaging> {
    return await this.prisma.activityLog.paginate(
      {
        ...kwargs,
        include: { createdByUser: { select: { id: true, name: true, email: true } } },
      },
      options,
    )
  }

  private getContract(action: EnumActivityLogAction): IActivityLogActionContract {
    const contract = ActivityLogActionContract[action]
    if (!contract) {
      throw new ActivityLogContractInvalidException(`No contract for action ${action}`)
    }
    return contract
  }

  private validateMetadata(
    action: EnumActivityLogAction,
    contract: IActivityLogActionContract,
    metadata: IActivityLogMetadata,
  ): IActivityLogMetadata {
    const instance = plainToInstance(contract.metadata, metadata)
    const errors = validateSync(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: false,
    })
    if (errors.length) {
      const reasons = errors.map(
        e => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`,
      )
      throw new ActivityLogContractInvalidException(
        `Invalid metadata for ${action}: ${reasons.join('; ')}`,
      )
    }
    // Plain copy of the validated keys only (no class instance stored in JSON)
    return { ...instance } as IActivityLogMetadata
  }

  private assertOwnerFields(input: IActivityLogPrepareInput, owner: EnumActivityLogOwner): void {
    const has = (value?: number): boolean => value !== undefined && value !== null
    let valid: boolean
    switch (owner) {
      case EnumActivityLogOwner.PAYLOAD_USER:
      case EnumActivityLogOwner.PAYLOAD_CUSTOMER:
        valid = !has(input.userId) && !has(input.customerId) && !has(input.createdBy)
        break
      case EnumActivityLogOwner.USER:
        valid = has(input.userId) && !has(input.customerId)
        break
      case EnumActivityLogOwner.CUSTOMER:
        valid = has(input.customerId) && !has(input.userId)
        break
    }
    if (!valid) {
      throw new ActivityLogContractInvalidException(
        `Owner fields do not match ${owner} for ${input.action}`,
      )
    }
  }

  private buildRow(
    event: IActivityLogStagedEvent,
    request: IActivityLogRequestInfo,
  ): Prisma.ActivityLogCreateManyInput {
    const { owner } = this.getContract(event.action)
    let userId: number | null = null
    let customerId: number | null = null
    let createdBy: number | null = event.createdBy ?? null

    switch (owner) {
      case EnumActivityLogOwner.PAYLOAD_USER:
        userId = this.payloadId(request, EnumAuthScopeType.USER, event.action)
        createdBy = userId
        break
      case EnumActivityLogOwner.PAYLOAD_CUSTOMER:
        customerId = this.payloadId(request, EnumAuthScopeType.CUSTOMER, event.action)
        createdBy = null
        break
      case EnumActivityLogOwner.USER:
        userId = event.userId
        createdBy = event.createdBy ?? event.userId
        break
      case EnumActivityLogOwner.CUSTOMER:
        customerId = event.customerId
        break
    }

    return {
      userId,
      customerId,
      createdBy,
      action: event.action,
      description: this.activityLogUtil.getDescription(event.action, event.metadata),
      ipAddress: request.ipAddress,
      userAgent: request.userAgent ?? Prisma.JsonNull,
      metadata: event.metadata,
    }
  }

  private payloadId(
    request: IActivityLogRequestInfo,
    scopeType: EnumAuthScopeType,
    action: EnumActivityLogAction,
  ): number {
    if (request.payload?.scopeType !== scopeType) {
      throw new ActivityLogContractInvalidException(
        `${action} needs a ${scopeType} JWT, got ${request.payload?.scopeType ?? 'none'}`,
      )
    }
    return request.payload.id
  }
}
