import { Global, Module } from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { ActivityLogUtil } from './helpers/activity-log.util'
import { ActivityLogInterceptor } from './interceptors/activity-log.interceptor'
import { ActivityLogService } from './services/activity-log.service'

// Global so every feature module can inject ActivityLogService without importing this module
@Global()
@Module({
  providers: [
    ActivityLogService,
    ActivityLogUtil,
    { provide: APP_INTERCEPTOR, useClass: ActivityLogInterceptor },
  ],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
