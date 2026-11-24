import { Controller, Delete, Get, Post, Put } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Prisma } from '@runtime/prisma-client'
import { EnumActivityLogAction } from 'modules/activity-log/enums/activity-log.enum'
import { EnumAuthAbilityAction, EnumAuthAbilitySubject } from 'app/enums/user.enum'
import { AuthJwtPayload, EnumAuthScopeType } from 'lib/nest-auth'
import { EnumFileExtensionDocument } from 'lib/nest-core'
import {
  ApiRequestData,
  ApiRequestPaging,
  IResponseData,
  IResponsePaging,
  RequestBody,
  RequestBookType,
  RequestFilterDto,
  RequestListDto,
  RequestParam,
  RequestQueryFilterEqual,
  RequestQueryList,
} from 'lib/nest-web'
import {
  CONTENT_DOC_ADMIN_QUERY_LIST,
  CONTENT_DOC_OPERATION,
} from '../constants/content.doc.constant'
import { IActivityLogStagedEvent } from 'modules/activity-log/interfaces/activity-log.interface'
import { ActivityLogService } from 'modules/activity-log/services/activity-log.service'
import { ContentRequestCreateDto } from '../dtos/content.request.create.dto'
import { ContentRequestUpdateDto } from '../dtos/content.request.update.dto'
import {
  ContentResponseDetailDto,
  ContentResponseListDto,
} from '../dtos/content.response.detail.dto'
import { ContentService } from '../services/content.service'

@ApiTags(CONTENT_DOC_OPERATION)
@Controller({ path: '/contents' })
export class ContentAdminController {
  constructor(
    protected readonly contentService: ContentService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /** Prepares an admin content event from the row (prepare validates the contract). */
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
    summary: CONTENT_DOC_OPERATION,
    queries: CONTENT_DOC_ADMIN_QUERY_LIST,
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
            subject: EnumAuthAbilitySubject.CONTENT,
            actions: [EnumAuthAbilityAction.READ],
          },
        ],
      },
    },
    response: {
      dto: ContentResponseListDto,
    },
  })
  @Get('/')
  async list(
    @RequestQueryList({
      defaultPerPage: 50,
      defaultOrderBy: 'isActive:desc|sorting:desc|id:desc',
      availableOrderBy: ['id', 'sorting', 'isActive'],
    })
    { _search, _kwargs }: RequestListDto,
    @RequestBookType() bookType: EnumFileExtensionDocument,
    @RequestQueryFilterEqual('type') _type: RequestFilterDto,
  ): Promise<IResponsePaging> {
    const kwargs: Prisma.ContentFindManyArgs = {
      ..._kwargs,
      where: {
        ..._search,
        ..._type,
        isVisible: true,
      },
      include: {
        createdByUser: true,
        updatedByUser: true,
      },
    }

    return await this.contentService.getPage(kwargs, {
      document: bookType,
    })
  }

  @ApiRequestData({
    summary: CONTENT_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: false,
        require: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.CONTENT,
            actions: [EnumAuthAbilityAction.READ],
          },
        ],
      },
    },
    response: {
      dto: ContentResponseDetailDto,
    },
  })
  @Get('/:id')
  async get(@RequestParam('id') id: number): Promise<IResponseData> {
    const content = await this.contentService.findOrFail(id, {
      include: {
        createdByUser: true,
        updatedByUser: true,
      },
    })
    return { data: content }
  }

  @ApiRequestData({
    summary: CONTENT_DOC_OPERATION,
    deprecated: true,
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
            subject: EnumAuthAbilitySubject.CONTENT,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.CREATE],
          },
        ],
      },
    },
    response: {
      dto: ContentResponseDetailDto,
    },
  })
  @Post('/')
  async create(
    @RequestBody() body: ContentRequestCreateDto,
    @AuthJwtPayload('user.id') createdBy: number,
  ): Promise<IResponseData> {
    const created = await this.contentService.create({
      ...body,
      createdBy,
    })
    // Autoincrement id: the event can only be prepared once the row exists
    this.activityLogService.stagePrepared([
      this.prepareActivityLog(EnumActivityLogAction.adminContentCreate, created),
    ])
    return { data: created }
  }

  @ApiRequestData({
    summary: CONTENT_DOC_OPERATION,
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
            subject: EnumAuthAbilitySubject.CONTENT,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.UPDATE],
          },
        ],
      },
    },
    response: {
      dto: ContentResponseDetailDto,
    },
  })
  @Put('/:id')
  async update(
    @RequestBody() body: ContentRequestUpdateDto,
    @RequestParam('id') id: number,
    @AuthJwtPayload('user.id') updatedBy: number,
  ): Promise<IResponseData> {
    const updated = await this.contentService.update(id, {
      ...body,
      updatedBy,
    })
    this.activityLogService.stagePrepared([
      this.prepareActivityLog(EnumActivityLogAction.adminContentUpdate, updated),
    ])

    return { data: updated }
  }

  @ApiRequestData({
    summary: CONTENT_DOC_OPERATION,
    deprecated: true,
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
            subject: EnumAuthAbilitySubject.CONTENT,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.DELETE],
          },
        ],
      },
    },
  })
  @Delete('/:id')
  async delete(@RequestParam('id') id: number): Promise<IResponseData> {
    const content = await this.contentService.findOrFail(id)
    const events = [this.prepareActivityLog(EnumActivityLogAction.adminContentDelete, content)]
    await this.contentService.delete(id)
    this.activityLogService.stagePrepared(events)
    return { data: { id } }
  }

  @ApiRequestData({
    summary: CONTENT_DOC_OPERATION,
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
            subject: EnumAuthAbilitySubject.CONTENT,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.UPDATE],
          },
        ],
      },
    },
    response: {
      dto: ContentResponseDetailDto,
    },
  })
  @Put('/:id/active')
  async active(
    @RequestParam('id') id: number,
    @AuthJwtPayload('user.id') updatedBy: number,
  ): Promise<IResponseData> {
    const updated = await this.contentService.change(id, {
      isActive: true,
      updatedBy,
    })
    this.activityLogService.stagePrepared([
      this.prepareActivityLog(EnumActivityLogAction.adminContentUpdateStatus, updated, true),
    ])

    return { data: updated }
  }

  @ApiRequestData({
    summary: CONTENT_DOC_OPERATION,
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
            subject: EnumAuthAbilitySubject.CONTENT,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.UPDATE],
          },
        ],
      },
    },
    response: {
      dto: ContentResponseDetailDto,
    },
  })
  @Put('/:id/inactive')
  async inactive(
    @RequestParam('id') id: number,
    @AuthJwtPayload('user.id') updatedBy: number,
  ): Promise<IResponseData> {
    const updated = await this.contentService.change(id, {
      isActive: false,
      updatedBy,
    })
    this.activityLogService.stagePrepared([
      this.prepareActivityLog(EnumActivityLogAction.adminContentUpdateStatus, updated, true),
    ])

    return { data: updated }
  }
}
