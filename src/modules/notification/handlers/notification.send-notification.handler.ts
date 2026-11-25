import { Injectable } from '@nestjs/common'
import { IWorkerJobResult, LoggerService, WorkerHandlerBase } from 'lib/nest-core'
import { NOTIFICATION_QUEUE_PROC_VERSION } from '../constants/notification.constant'
import { EnumNotificationQueue } from '../enums/notification.enum'
import { INotificationSendPushPayload } from '../interfaces/notification.queue.interface'
import { NotificationService } from '../services/notification.service'

@Injectable()
export class NotificationSendPushHandler extends WorkerHandlerBase<INotificationSendPushPayload> {
  topic = EnumNotificationQueue.SEND_PUSH
  version: number = NOTIFICATION_QUEUE_PROC_VERSION[EnumNotificationQueue.SEND_PUSH]

  constructor(
    private readonly logger: LoggerService,
    private readonly notificationService: NotificationService,
  ) {
    super()
  }

  async handle(version: number, payload: INotificationSendPushPayload): Promise<IWorkerJobResult> {
    this.logger.log(`${this.topic}:v${version} is handling...`)

    try {
      for (const customerId of payload.customerIds) {
        await this.notificationService.dispatchPushToCustomer(customerId, payload.pushId)
      }
    } catch (err: unknown) {
      this.logger.log(err)
    }

    return this.ok()
  }
}
