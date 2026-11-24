import { Controller, Delete, Get, Post, Put } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Prisma } from '@runtime/prisma-client'
import { EnumActivityLogAction } from 'modules/activity-log/enums/activity-log.enum'
import { EnumAuthAbilityAction, EnumAuthAbilitySubject } from 'app/enums/user.enum'
import { AuthJwtPayload, EnumAuthScopeType } from 'lib/nest-auth'
import { EnumFileExtensionDocument } from 'lib/nest-core'
import {
  ApiRequestData,
  ApiRequestList,
  ApiRequestPaging,
  IResponseData,
  IResponseList,
  IResponsePaging,
  RequestBody,
  RequestBookType,
  RequestListDto,
  RequestParam,
  RequestQueryList,
} from 'lib/nest-web'
import {
  APP_VERSION_DOC_ADMIN_QUERY_LIST,
  APP_VERSION_DOC_OPERATION,
} from '../constants/app-version.doc.constant'
import { IActivityLogStagedEvent } from 'modules/activity-log/interfaces/activity-log.interface'
import { ActivityLogService } from 'modules/activity-log/services/activity-log.service'
import { AppVersionRequestCreateDto } from '../dtos/app-version.request.create.dto'
import { AppVersionRequestUpdateDto } from '../dtos/app-version.request.update.dto'
import {
  AppVersionResponseDetailDto,
  AppVersionResponseListDto,
} from '../dtos/app-version.response.detail.dto'
import { AppVersionService } from '../services/app-version.service'

@ApiTags(APP_VERSION_DOC_OPERATION)
@Controller({ path: '/app-versions' })
export class AppVersionAdminController {
  constructor(
    protected readonly appVersionService: AppVersionService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /** Prepares an admin app version event from the row (prepare validates the contract). */
  private prepareActivityLog(
    action: EnumActivityLogAction,
    row: { id: number; name?: string | null; isActive?: boolean | null },
    withStatus = false,
  ): IActivityLogStagedEvent {
    return this.activityLogService.prepare({
      action,
      metadata: {
        id: row.id,
        name: row.name ?? undefined,
        ...(withStatus ? { isActive: row.isActive ?? false } : {}),
      },
    })
  }

  @ApiRequestPaging({
    summary: APP_VERSION_DOC_OPERATION,
    queries: APP_VERSION_DOC_ADMIN_QUERY_LIST,
    sortable: true,
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
            subject: EnumAuthAbilitySubject.APP_VERSION,
            actions: [EnumAuthAbilityAction.READ],
          },
        ],
      },
    },
    response: {
      dto: AppVersionResponseListDto,
    },
  })
  @Get('/')
  async list(
    @RequestQueryList({
      defaultPerPage: 50,
      defaultOrderBy: 'id:desc',
      availableOrderBy: ['id'],
    })
    { _search, _kwargs }: RequestListDto,
    @RequestBookType() bookType: EnumFileExtensionDocument,
  ): Promise<IResponsePaging> {
    const kwargs: Prisma.AppVersionFindManyArgs = {
      ..._kwargs,
      where: {
        ..._search,
      },
    }

    return await this.appVersionService.getPage(kwargs, {
      document: bookType,
    })
  }

  @ApiRequestList({
    summary: APP_VERSION_DOC_OPERATION,
    queries: APP_VERSION_DOC_ADMIN_QUERY_LIST,
    sortable: false,
    searchable: false,
    exportable: false,
    docExclude: true,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: false,
        require: false,
      },
    },
    response: {
      dto: AppVersionResponseListDto,
    },
  })
  @Get('/map-shorted')
  async mapShorted(
    @RequestQueryList({
      defaultOrderBy: 'name:asc',
      availableOrderBy: ['name'],
    })
    { _search, _kwargs }: RequestListDto,
  ): Promise<IResponseList> {
    return await this.appVersionService.getList({
      ..._kwargs,
      where: { ..._search },
      select: { id: true },
    })
  }

  @ApiRequestData({
    summary: APP_VERSION_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: false,
        require: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.APP_VERSION,
            actions: [EnumAuthAbilityAction.READ],
          },
        ],
      },
    },
    response: {
      dto: AppVersionResponseDetailDto,
    },
  })
  @Get('/:id')
  async get(@RequestParam('id') id: number): Promise<IResponseData> {
    const appVersion = await this.appVersionService.findOrFail(id)

    return {
      data: appVersion,
    }
  }

  @ApiRequestData({
    summary: APP_VERSION_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: true,
        require: true,
        active: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.APP_VERSION,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.CREATE],
          },
        ],
      },
    },
    response: {
      dto: AppVersionResponseDetailDto,
    },
  })
  @Post('/')
  async create(@RequestBody() body: AppVersionRequestCreateDto): Promise<IResponseData> {
    const appVersion = await this.appVersionService.create(body)
    // Autoincrement id: the event can only be prepared once the row exists
    this.activityLogService.stagePrepared([
      this.prepareActivityLog(EnumActivityLogAction.adminAppVersionCreate, appVersion),
    ])

    return {
      data: appVersion,
    }
  }

  @ApiRequestData({
    summary: APP_VERSION_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: true,
        require: true,
        active: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.APP_VERSION,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.UPDATE],
          },
        ],
      },
    },
    response: {
      dto: AppVersionResponseDetailDto,
    },
  })
  @Put('/:id')
  async update(
    @RequestBody() body: AppVersionRequestUpdateDto,
    @RequestParam('id') id: number,
  ): Promise<IResponseData> {
    const appVersion = await this.appVersionService.update(id, body)
    this.activityLogService.stagePrepared([
      this.prepareActivityLog(EnumActivityLogAction.adminAppVersionUpdate, appVersion),
    ])

    return {
      data: appVersion,
    }
  }

  @ApiRequestData({
    summary: APP_VERSION_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: true,
        require: true,
        active: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.APP_VERSION,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.UPDATE],
          },
        ],
      },
    },
    response: {
      dto: AppVersionResponseDetailDto,
    },
  })
  @Put('/:id/inactive')
  async inactive(@RequestParam('id') id: number): Promise<IResponseData> {
    const appVersion = await this.appVersionService.inactive(id)
    this.activityLogService.stagePrepared([
      this.prepareActivityLog(EnumActivityLogAction.adminAppVersionUpdateStatus, appVersion, true),
    ])

    return {
      data: appVersion,
    }
  }

  @ApiRequestData({
    summary: APP_VERSION_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: true,
        require: true,
        active: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.APP_VERSION,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.UPDATE],
          },
        ],
      },
    },
    response: {
      dto: AppVersionResponseDetailDto,
    },
  })
  @Put('/:id/active')
  async active(@RequestParam('id') id: number): Promise<IResponseData> {
    const appVersion = await this.appVersionService.active(id)
    this.activityLogService.stagePrepared([
      this.prepareActivityLog(EnumActivityLogAction.adminAppVersionUpdateStatus, appVersion, true),
    ])

    return {
      data: appVersion,
    }
  }

  @ApiRequestData({
    summary: APP_VERSION_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: true,
        require: true,
        active: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.APP_VERSION,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.DELETE],
          },
        ],
      },
    },
  })
  @Delete('/:id')
  async delete(
    @RequestParam('id') id: number,
    @AuthJwtPayload('user.id') deletedBy: number,
  ): Promise<IResponseData> {
    const appVersion = await this.appVersionService.findOrFail(id)
    const events = [
      this.prepareActivityLog(EnumActivityLogAction.adminAppVersionDelete, appVersion),
    ]
    // The service swallows errors and reports failure as false: only log a real delete
    if (await this.appVersionService.delete(id, deletedBy)) {
      this.activityLogService.stagePrepared(events)
    }

    return {
      data: { status: true },
    }
  }
}
