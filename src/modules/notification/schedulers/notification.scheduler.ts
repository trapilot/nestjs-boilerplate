import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { EnumScopeType, HelperService, OnScope, WORKER_LOG_CONTEXT } from 'lib/nest-core'
import { NotificationService } from '../services/notification.service'

@Injectable()
export class NotificationScheduler {
  constructor(
    private readonly helperService: HelperService,
    private readonly notificationService: NotificationService,
  ) {}

  // Feeds the job worker: logs go to logs/worker and its 5s polling SQL is not logged
  @Cron(CronExpression.EVERY_5_SECONDS)
  @OnScope(EnumScopeType.CRON, { context: WORKER_LOG_CONTEXT, raw: true, query: false })
  async scanPendingPush(): Promise<void> {
    await this.notificationService.enqueueScanPendingPush({
      startDate: this.helperService.dateEnd(),
    })
  }
}
