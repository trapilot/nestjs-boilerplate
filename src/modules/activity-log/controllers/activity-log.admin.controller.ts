import { Controller, Get, ParseEnumPipe, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Prisma } from '@runtime/prisma-client'
import { EnumActivityLogAction, EnumActivityLogOwnerType } from '../enums/activity-log.enum'
import { EnumAuthAbilityAction, EnumAuthAbilitySubject } from 'app/enums/user.enum'
import { AuthJwtPayload, EnumAuthScopeType } from 'lib/nest-auth'
import {
  ApiRequestPaging,
  IResponsePaging,
  RequestFilterDto,
  RequestListDto,
  RequestParam,
  RequestQueryFilterEqual,
  RequestQueryFilterInEnum,
  RequestQueryList,
} from 'lib/nest-web'
import {
  ACTIVITY_LOG_DOC_ADMIN_PARAM_CUSTOMER,
  ACTIVITY_LOG_DOC_ADMIN_PARAM_USER,
  ACTIVITY_LOG_DOC_ADMIN_QUERY_LIST,
  ACTIVITY_LOG_DOC_ADMIN_QUERY_LIST_ALL,
  ACTIVITY_LOG_DOC_OPERATION,
} from '../constants/activity-log.doc.constant'
import { ActivityLogResponseDetailDto } from '../dtos/activity-log.response.detail.dto'
import { ActivityLogService } from '../services/activity-log.service'

const LIST_QUERY = {
  defaultPerPage: 50,
  defaultOrderBy: 'createdAt:desc',
  availableOrderBy: ['createdAt', 'id'],
}

const READ_ACTIVITY_LOG = {
  scope: EnumAuthScopeType.USER,
  user: {
    synchronize: false,
    require: true,
    abilities: [
      {
        subject: EnumAuthAbilitySubject.ACTIVITY_LOG,
        actions: [EnumAuthAbilityAction.READ],
      },
    ],
  },
}

@ApiTags(ACTIVITY_LOG_DOC_OPERATION)
@Controller({ path: '/activity-logs' })
export class ActivityLogAdminController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  // Every staff User's and Customer's logs; `ownerType` tells which kind of account owns a row
  @ApiRequestPaging({
    summary: ACTIVITY_LOG_DOC_OPERATION,
    queries: ACTIVITY_LOG_DOC_ADMIN_QUERY_LIST_ALL,
    sortable: true,
    searchable: false,
    exportable: false,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: READ_ACTIVITY_LOG,
    response: { dto: ActivityLogResponseDetailDto },
  })
  @Get('/')
  async list(
    @RequestQueryList(LIST_QUERY) { _kwargs }: RequestListDto,
    @RequestQueryFilterInEnum('action', EnumActivityLogAction) _action: RequestFilterDto,
    @RequestQueryFilterEqual('userId', { parseAs: 'id' }) _user: RequestFilterDto,
    @RequestQueryFilterEqual('customerId', { parseAs: 'id' }) _customer: RequestFilterDto,
    @RequestQueryFilterEqual('correlationId') _correlation: RequestFilterDto,
    @Query('ownerType', new ParseEnumPipe(EnumActivityLogOwnerType, { optional: true }))
    ownerType?: EnumActivityLogOwnerType,
  ): Promise<IResponsePaging> {
    const owner: Prisma.ActivityLogWhereInput =
      ownerType === EnumActivityLogOwnerType.USER
        ? { userId: { not: null } }
        : ownerType === EnumActivityLogOwnerType.CUSTOMER
          ? { customerId: { not: null } }
          : {}

    const kwargs: Prisma.ActivityLogFindManyArgs = {
      ..._kwargs,
      where: { ..._action, ..._user, ..._customer, ..._correlation, ...owner },
    }
    return await this.activityLogService.getPageAll(kwargs)
  }

  @ApiRequestPaging({
    summary: ACTIVITY_LOG_DOC_OPERATION,
    queries: ACTIVITY_LOG_DOC_ADMIN_QUERY_LIST,
    sortable: true,
    searchable: false,
    exportable: false,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: { scope: EnumAuthScopeType.USER, user: { synchronize: false, require: true } },
    response: { dto: ActivityLogResponseDetailDto },
  })
  @Get('/_me')
  async listMine(
    @AuthJwtPayload('user.id') userId: number,
    @RequestQueryList(LIST_QUERY) { _kwargs }: RequestListDto,
    @RequestQueryFilterInEnum('action', EnumActivityLogAction) _action: RequestFilterDto,
  ): Promise<IResponsePaging> {
    const kwargs: Prisma.ActivityLogFindManyArgs = { ..._kwargs, where: { ..._action } }
    return await this.activityLogService.getPageByUser(userId, kwargs)
  }

  @ApiRequestPaging({
    summary: ACTIVITY_LOG_DOC_OPERATION,
    params: ACTIVITY_LOG_DOC_ADMIN_PARAM_USER,
    queries: ACTIVITY_LOG_DOC_ADMIN_QUERY_LIST,
    sortable: true,
    searchable: false,
    exportable: false,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: READ_ACTIVITY_LOG,
    response: { dto: ActivityLogResponseDetailDto },
  })
  @Get('/users/:userId')
  async listByUser(
    @RequestParam('userId') userId: number,
    @RequestQueryList(LIST_QUERY) { _kwargs }: RequestListDto,
    @RequestQueryFilterInEnum('action', EnumActivityLogAction) _action: RequestFilterDto,
  ): Promise<IResponsePaging> {
    const kwargs: Prisma.ActivityLogFindManyArgs = { ..._kwargs, where: { ..._action } }
    return await this.activityLogService.getPageByUser(userId, kwargs)
  }

  @ApiRequestPaging({
    summary: ACTIVITY_LOG_DOC_OPERATION,
    params: ACTIVITY_LOG_DOC_ADMIN_PARAM_CUSTOMER,
    queries: ACTIVITY_LOG_DOC_ADMIN_QUERY_LIST,
    sortable: true,
    searchable: false,
    exportable: false,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: READ_ACTIVITY_LOG,
    response: { dto: ActivityLogResponseDetailDto },
  })
  @Get('/customers/:customerId')
  async listByCustomer(
    @RequestParam('customerId') customerId: number,
    @RequestQueryList(LIST_QUERY) { _kwargs }: RequestListDto,
    @RequestQueryFilterInEnum('action', EnumActivityLogAction) _action: RequestFilterDto,
  ): Promise<IResponsePaging> {
    const kwargs: Prisma.ActivityLogFindManyArgs = { ..._kwargs, where: { ..._action } }
    return await this.activityLogService.getPageByCustomer(customerId, kwargs)
  }
}
