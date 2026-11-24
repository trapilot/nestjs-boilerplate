import { Controller, Get, Post, Put } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Prisma } from '@runtime/prisma-client'
import { EnumActivityLogAction } from 'modules/activity-log/enums/activity-log.enum'
import { EnumAuthAbilityAction, EnumAuthAbilitySubject } from 'app/enums/user.enum'
import { UserAbilityUtil } from 'app/helpers/user.ability.util'
import { AuthJwtPayload, EnumAuthScopeType } from 'lib/nest-auth'
import {
  ApiRequestData,
  ApiRequestList,
  IResponseData,
  IResponseList,
  RequestBody,
  RequestFilterDto,
  RequestListDto,
  RequestParam,
  RequestQueryFilterInBoolean,
  RequestQueryList,
} from 'lib/nest-web'
import { IActivityLogStagedEvent } from 'modules/activity-log/interfaces/activity-log.interface'
import { ActivityLogService } from 'modules/activity-log/services/activity-log.service'
import { POLICY_DOC_ADMIN_QUERY_LIST, POLICY_DOC_OPERATION } from '../constants/policy.doc.constant'
import { PolicyRequestCreateDto } from '../dtos/policy.request.create.dto'
import { PolicyRequestUpdateDto } from '../dtos/policy.request.update.dto'
import { PolicyResponseDetailDto, PolicyResponseListDto } from '../dtos/policy.response.detail.dto'
import { PolicyService } from '../services/policy.service'

@ApiTags(POLICY_DOC_OPERATION)
@Controller({ path: '/policies' })
export class PolicyAdminController {
  constructor(
    protected readonly policyService: PolicyService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /** Prepares an admin policy event from the row (prepare validates the contract). */
  private prepareActivityLog(
    action: EnumActivityLogAction,
    row: { id: number },
  ): IActivityLogStagedEvent {
    return this.activityLogService.prepare({
      action,
      metadata: { id: row.id },
    })
  }

  @ApiRequestList({
    summary: POLICY_DOC_OPERATION,
    queries: POLICY_DOC_ADMIN_QUERY_LIST,
    sortable: false,
    searchable: false,
    exportable: false,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: false,
        require: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.POLICY,
            actions: [EnumAuthAbilityAction.READ],
          },
        ],
      },
    },
    response: {
      dto: PolicyResponseListDto,
    },
  })
  @Get('/')
  async list(
    @RequestQueryList({
      defaultOrderBy: 'sorting:asc',
      availableOrderBy: ['sorting'],
    })
    { _search, _kwargs }: RequestListDto,
    @RequestQueryFilterInBoolean('isActive', true) _enabled: RequestFilterDto,
    @RequestQueryFilterInBoolean('isVisible', true) _visible: RequestFilterDto,
  ): Promise<IResponseList> {
    const kwargs: Prisma.PolicyFindManyArgs = {
      ..._kwargs,
      where: {
        ..._search,
        ..._enabled,
        ..._visible,
      },
    }
    return await this.policyService.getList(kwargs)
  }

  @ApiRequestData({
    summary: POLICY_DOC_OPERATION,
    docExclude: true,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: false,
        require: true,
        active: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.POLICY,
            actions: [EnumAuthAbilityAction.READ],
          },
        ],
      },
    },
    response: {
      dto: PolicyResponseDetailDto,
    },
  })
  @Get('/:id')
  async get(@RequestParam('id') id: number): Promise<IResponseData> {
    const policy = await this.policyService.findOrFail(id)
    return { data: policy }
  }

  @ApiRequestData({
    summary: POLICY_DOC_OPERATION,
    docExclude: true,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: true,
        require: true,
        active: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.POLICY,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.UPDATE],
          },
        ],
      },
    },
    response: {
      dto: PolicyResponseDetailDto,
    },
  })
  @Put('/:id')
  async update(
    @RequestBody() body: PolicyRequestUpdateDto,
    @RequestParam('id') id: number,
    @AuthJwtPayload('user.id') updatedBy: number,
  ): Promise<IResponseData> {
    const { actions, ...dto } = body

    const data: Prisma.PolicyUncheckedUpdateInput = {
      ...dto,
      updatedBy,
      bitwise: UserAbilityUtil.map2Bitwise(actions),
    }

    const updated = await this.policyService.update(id, data)
    this.activityLogService.stagePrepared([
      this.prepareActivityLog(EnumActivityLogAction.adminPolicyUpdate, updated),
    ])

    return { data: updated }
  }

  @ApiRequestData({
    summary: POLICY_DOC_OPERATION,
    docExclude: true,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: true,
        require: true,
        active: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.POLICY,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.CREATE],
          },
        ],
      },
    },
    response: {
      dto: PolicyResponseDetailDto,
    },
  })
  @Post('/')
  async create(
    @RequestBody() body: PolicyRequestCreateDto,
    @AuthJwtPayload('user.id') createdBy: number,
  ): Promise<IResponseData> {
    const { actions, ...dto } = body
    const data: Prisma.PolicyUncheckedCreateInput = {
      ...dto,
      createdBy,
      bitwise: UserAbilityUtil.map2Bitwise(actions),
    }

    const created = await this.policyService.create(data)
    // Autoincrement id: the event can only be prepared once the row exists
    this.activityLogService.stagePrepared([
      this.prepareActivityLog(EnumActivityLogAction.adminPolicyCreate, created),
    ])
    return { data: created }
  }
}
