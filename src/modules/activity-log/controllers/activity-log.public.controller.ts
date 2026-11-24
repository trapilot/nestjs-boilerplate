import { Controller, Post, VERSION_NEUTRAL } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { ApiRequestData, IResponseData, RequestBody } from 'lib/nest-web'
import { ACTIVITY_LOG_DOC_OPERATION } from '../constants/activity-log.doc.constant'
import { ActivityLogRequestEntryDto } from '../dtos/activity-log.request.entry.dto'
import { ActivityLogService } from '../services/activity-log.service'

@ApiTags(ACTIVITY_LOG_DOC_OPERATION)
@Controller({ version: VERSION_NEUTRAL, path: '/activity-logs' })
export class ActivityLogPublicController {
  constructor(protected readonly activityLogService: ActivityLogService) {}

  @ApiRequestData({
    summary: ACTIVITY_LOG_DOC_OPERATION,
    docExclude: true,
    docExpansion: false,
    rateLimit: {
      short: { limit: 3, seconds: 1 },
      long: { limit: 100, seconds: 60 },
    },
  })
  @Post('/send-entry')
  async createEntry(@RequestBody() _body: ActivityLogRequestEntryDto): Promise<IResponseData> {
    return { data: { success: true } }
  }
}
