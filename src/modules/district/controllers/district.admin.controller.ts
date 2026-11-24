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
  DISTRICT_DOC_ADMIN_QUERY_LIST,
  DISTRICT_DOC_OPERATION,
} from '../constants/district.doc.constant'
import { IActivityLogStagedEvent } from 'modules/activity-log/interfaces/activity-log.interface'
import { ActivityLogService } from 'modules/activity-log/services/activity-log.service'
import { DistrictRequestCreateDto } from '../dtos/district.request.create.dto'
import { DistrictRequestUpdateDto } from '../dtos/district.request.update.dto'
import {
  DistrictResponseDetailDto,
  DistrictResponseListDto,
} from '../dtos/district.response.detail.dto'
import { DistrictService } from '../services/district.service'

@ApiTags(DISTRICT_DOC_OPERATION)
@Controller({ path: '/districts' })
export class DistrictAdminController {
  constructor(
    protected readonly districtService: DistrictService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /** Prepares an admin district event from the row (prepare validates the contract). */
  private prepareActivityLog(
    action: EnumActivityLogAction,
    row: { id: number },
  ): IActivityLogStagedEvent {
    return this.activityLogService.prepare({
      action,
      metadata: { id: row.id },
    })
  }

  @ApiRequestPaging({
    summary: DISTRICT_DOC_OPERATION,
    queries: DISTRICT_DOC_ADMIN_QUERY_LIST,
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
            subject: EnumAuthAbilitySubject.DISTRICT,
            actions: [EnumAuthAbilityAction.READ],
          },
        ],
      },
    },
    response: {
      dto: DistrictResponseListDto,
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
    const kwargs: Prisma.DistrictFindManyArgs = {
      ..._kwargs,
      where: {
        ..._search,
        isVisible: true,
      },
    }

    return await this.districtService.getPage(kwargs, {
      document: bookType,
    })
  }

  @ApiRequestList({
    summary: DISTRICT_DOC_OPERATION,
    queries: DISTRICT_DOC_ADMIN_QUERY_LIST,
    sortable: false,
    searchable: false,
    exportable: false,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: false,
        require: false,
      },
    },
    response: {
      dto: DistrictResponseListDto,
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
    return await this.districtService.getList({
      ..._kwargs,
      where: { ..._search, isVisible: true },
      select: { id: true, name: true },
    })
  }

  @ApiRequestData({
    summary: DISTRICT_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: false,
        require: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.DISTRICT,
            actions: [EnumAuthAbilityAction.READ],
          },
        ],
      },
    },
    response: {
      dto: DistrictResponseDetailDto,
    },
  })
  @Get('/:id')
  async get(@RequestParam('id') id: number): Promise<IResponseData> {
    const district = await this.districtService.findOrFail(id)

    return {
      data: district,
    }
  }

  @ApiRequestData({
    summary: DISTRICT_DOC_OPERATION,
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
            subject: EnumAuthAbilitySubject.DISTRICT,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.CREATE],
          },
        ],
      },
    },
    response: {
      dto: DistrictResponseDetailDto,
    },
  })
  @Post('/')
  async create(@RequestBody() body: DistrictRequestCreateDto): Promise<IResponseData> {
    const district = await this.districtService.create(body)
    // Autoincrement id: the event can only be prepared once the row exists
    this.activityLogService.stagePrepared([
      this.prepareActivityLog(EnumActivityLogAction.adminDistrictCreate, district),
    ])

    return {
      data: district,
    }
  }

  @ApiRequestData({
    summary: DISTRICT_DOC_OPERATION,
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
            subject: EnumAuthAbilitySubject.DISTRICT,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.UPDATE],
          },
        ],
      },
    },
    response: {
      dto: DistrictResponseDetailDto,
    },
  })
  @Put('/:id')
  async update(
    @RequestBody() body: DistrictRequestUpdateDto,
    @RequestParam('id') id: number,
  ): Promise<IResponseData> {
    const district = await this.districtService.update(id, body)
    this.activityLogService.stagePrepared([
      this.prepareActivityLog(EnumActivityLogAction.adminDistrictUpdate, district),
    ])

    return {
      data: district,
    }
  }

  @ApiRequestData({
    summary: DISTRICT_DOC_OPERATION,
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
            subject: EnumAuthAbilitySubject.DISTRICT,
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
    const district = await this.districtService.findOrFail(id)
    const events = [this.prepareActivityLog(EnumActivityLogAction.adminDistrictDelete, district)]
    // The service swallows errors and reports failure as false: only log a real delete
    if (await this.districtService.delete(id, deletedBy)) {
      this.activityLogService.stagePrepared(events)
    }

    return {
      data: { status: true },
    }
  }
}
