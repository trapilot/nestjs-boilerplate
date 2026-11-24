import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Prisma } from '@runtime/prisma-client'
import { EnumActivityLogAction } from '../enums/activity-log.enum'
import { AuthJwtPayload, EnumAuthScopeType } from 'lib/nest-auth'
import {
  ApiRequestPaging,
  IResponsePaging,
  RequestFilterDto,
  RequestListDto,
  RequestQueryFilterInEnum,
  RequestQueryList,
} from 'lib/nest-web'
import {
  ACTIVITY_LOG_DOC_APP_QUERY_LIST,
  ACTIVITY_LOG_DOC_OPERATION,
} from '../constants/activity-log.doc.constant'
import { ActivityLogResponseDetailDto } from '../dtos/activity-log.response.detail.dto'
import { ActivityLogService } from '../services/activity-log.service'

@ApiTags(ACTIVITY_LOG_DOC_OPERATION)
@Controller({ version: '1', path: '/activity-logs' })
export class ActivityLogAppController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @ApiRequestPaging({
    summary: ACTIVITY_LOG_DOC_OPERATION,
    queries: ACTIVITY_LOG_DOC_APP_QUERY_LIST,
    sortable: true,
    searchable: false,
    exportable: false,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.CUSTOMER,
      user: { synchronize: true, require: true, active: true, unique: false },
    },
    response: { dto: ActivityLogResponseDetailDto },
  })
  @Get('/')
  async listMine(
    @AuthJwtPayload('user.id') customerId: number,
    @RequestQueryList({
      defaultPerPage: 20,
      defaultOrderBy: 'createdAt:desc',
      availableOrderBy: ['createdAt', 'id'],
    })
    { _kwargs }: RequestListDto,
    @RequestQueryFilterInEnum('action', EnumActivityLogAction) _action: RequestFilterDto,
  ): Promise<IResponsePaging> {
    const kwargs: Prisma.ActivityLogFindManyArgs = { ..._kwargs, where: { ..._action } }
    return await this.activityLogService.getPageByCustomer(customerId, kwargs)
  }
}
