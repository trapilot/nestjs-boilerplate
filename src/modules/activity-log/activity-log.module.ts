import { Module } from '@nestjs/common'
import { ActivityLogService } from './services/activity-log.service'

@Module({
  providers: [ActivityLogService],
  exports: [ActivityLogService],
  imports: [],
})
export class ActivityLogModule {}
