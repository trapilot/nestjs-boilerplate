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
  NOTIFICATION_DOC_ADMIN_QUERY_LIST,
  NOTIFICATION_DOC_OPERATION,
} from '../constants/notification.doc.constant'
import { IActivityLogStagedEvent } from 'modules/activity-log/interfaces/activity-log.interface'
import { ActivityLogService } from 'modules/activity-log/services/activity-log.service'
import { NotificationRequestCreateDto } from '../dtos/notification.request.create.dto'
import { NotificationRequestUpdateDto } from '../dtos/notification.request.update.dto'
import {
  NotificationResponseDetailDto,
  NotificationResponseListDto,
} from '../dtos/notification.response.detail.dto'
import { NotificationUtil } from '../helpers/notification.util'
import { NotificationService } from '../services/notification.service'

@ApiTags(NOTIFICATION_DOC_OPERATION)
@Controller({ path: '/notifications' })
export class NotificationAdminController {
  constructor(
    protected readonly notificationService: NotificationService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /** Prepares an admin notification event from the row (prepare validates the contract). */
  private prepareActivityLog(
    action: EnumActivityLogAction,
    row: { id: number; isActive?: boolean | null },
    withStatus = false,
  ): IActivityLogStagedEvent {
    return this.activityLogService.prepare({
      action,
      metadata: { id: row.id, ...(withStatus ? { isActive: row.isActive ?? false } : {}) },
    })
  }

  @ApiRequestPaging({
    summary: NOTIFICATION_DOC_OPERATION,
    queries: NOTIFICATION_DOC_ADMIN_QUERY_LIST,
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
            subject: EnumAuthAbilitySubject.NOTIFICATION,
            actions: [EnumAuthAbilityAction.READ],
          },
        ],
      },
    },
    response: {
      dto: NotificationResponseListDto,
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
    const kwargs: Prisma.NotificationFindManyArgs = {
      ..._kwargs,
      where: {
        ..._search,
      },
      include: {
        pushes: true,
      },
    }

    return await this.notificationService.getPage(kwargs, {
      document: bookType,
    })
  }

  @ApiRequestList({
    summary: NOTIFICATION_DOC_OPERATION,
    queries: NOTIFICATION_DOC_ADMIN_QUERY_LIST,
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
      dto: NotificationResponseListDto,
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
    return await this.notificationService.getList({
      ..._kwargs,
      where: { ..._search },
      select: { id: true, title: true },
    })
  }

  @ApiRequestData({
    summary: NOTIFICATION_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: false,
        require: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.NOTIFICATION,
            actions: [EnumAuthAbilityAction.READ],
          },
        ],
      },
    },
    response: {
      dto: NotificationResponseDetailDto,
    },
  })
  @Get('/:id')
  async get(@RequestParam('id') id: number): Promise<IResponseData> {
    const notification = await this.notificationService.findOrFail(id, {
      include: {
        pushes: true,
      },
    })

    return {
      data: notification,
    }
  }

  @ApiRequestData({
    summary: NOTIFICATION_DOC_OPERATION,
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
            subject: EnumAuthAbilitySubject.NOTIFICATION,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.UPDATE],
          },
        ],
      },
    },
    response: {
      dto: NotificationResponseDetailDto,
    },
  })
  @Put('/:id/inactive')
  async inactive(@RequestParam('id') id: number): Promise<IResponseData> {
    const notification = await this.notificationService.inactive(id)
    this.activityLogService.stagePrepared([
      this.prepareActivityLog(
        EnumActivityLogAction.adminNotificationUpdateStatus,
        notification,
        true,
      ),
    ])
    return { data: notification }
  }

  @ApiRequestData({
    summary: NOTIFICATION_DOC_OPERATION,
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
            subject: EnumAuthAbilitySubject.NOTIFICATION,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.UPDATE],
          },
        ],
      },
    },
    response: {
      dto: NotificationResponseDetailDto,
    },
  })
  @Put('/:id/active')
  async active(@RequestParam('id') id: number): Promise<IResponseData> {
    const notification = await this.notificationService.active(id)
    this.activityLogService.stagePrepared([
      this.prepareActivityLog(
        EnumActivityLogAction.adminNotificationUpdateStatus,
        notification,
        true,
      ),
    ])
    return { data: notification }
  }

  @ApiRequestData({
    summary: NOTIFICATION_DOC_OPERATION,
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
            subject: EnumAuthAbilitySubject.NOTIFICATION,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.CREATE],
          },
        ],
      },
    },
    response: {
      dto: NotificationResponseDetailDto,
    },
  })
  @Post('/')
  async create(@RequestBody() body: NotificationRequestCreateDto): Promise<IResponseData> {
    const { pushes, ...data } = body
    const notification = await this.notificationService.create({
      ...data,
      pushes: {
        createMany: {
          data: NotificationUtil.makeDtos(pushes),
        },
      },
    })
    // Autoincrement id: the event can only be prepared once the row exists
    this.activityLogService.stagePrepared([
      this.prepareActivityLog(EnumActivityLogAction.adminNotificationCreate, notification),
    ])

    return {
      data: notification,
    }
  }

  @ApiRequestData({
    summary: NOTIFICATION_DOC_OPERATION,
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
            subject: EnumAuthAbilitySubject.NOTIFICATION,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.UPDATE],
          },
        ],
      },
    },
    response: {
      dto: NotificationResponseDetailDto,
    },
  })
  @Put('/:id')
  async update(
    @RequestBody() body: NotificationRequestUpdateDto,
    @RequestParam('id') id: number,
  ): Promise<IResponseData> {
    const { pushes, ...data } = body
    const notification = await this.notificationService.update(id, {
      ...data,
      pushes: {
        createMany: {
          data: NotificationUtil.makeDtos(pushes),
        },
      },
    })
    this.activityLogService.stagePrepared([
      this.prepareActivityLog(EnumActivityLogAction.adminNotificationUpdate, notification),
    ])

    return {
      data: notification,
    }
  }

  @ApiRequestData({
    summary: NOTIFICATION_DOC_OPERATION,
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
            subject: EnumAuthAbilitySubject.NOTIFICATION,
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
    const notification = await this.notificationService.findOrFail(id)
    const events = [
      this.prepareActivityLog(EnumActivityLogAction.adminNotificationDelete, notification),
    ]
    // The service swallows errors and reports failure as false: only log a real delete
    if (await this.notificationService.delete(id, deletedBy)) {
      this.activityLogService.stagePrepared(events)
    }

    return {
      data: { status: true },
    }
  }
}
