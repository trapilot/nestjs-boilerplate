import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common'
import { IRequestApp } from 'lib/nest-core'
import { Observable, catchError, concatMap, from } from 'rxjs'
import { ActivityLogUtil } from '../helpers/activity-log.util'
import { IActivityLogRequestInfo } from '../interfaces/activity-log.interface'
import { ActivityLogService } from '../services/activity-log.service'

/**
 * Flushes staged activity-log events after the handler settles: every staged event on success,
 * only `onError: true` events on error. A flush failure is logged and never changes the response.
 */
@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActivityLogInterceptor.name)

  constructor(
    private readonly activityLogService: ActivityLogService,
    private readonly activityLogUtil: ActivityLogUtil,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle()
    }

    // Guards have already run, so request.user is the verified JWT payload (or unset)
    const request = this.activityLogUtil.getRequestInfo(
      context.switchToHttp().getRequest<IRequestApp>(),
    )

    return next.handle().pipe(
      concatMap(async result => {
        await this.flushSafe(request, false)
        return result
      }),
      catchError((error: unknown) =>
        from(
          (async () => {
            await this.flushSafe(request, true)
            throw error
          })(),
        ),
      ),
    )
  }

  private async flushSafe(request: IActivityLogRequestInfo, isError: boolean): Promise<void> {
    try {
      await this.activityLogService.flushStaged({ isError, request })
    } catch (error: unknown) {
      this.logger.error(error, 'Failed to flush staged activity logs')
    }
  }
}
