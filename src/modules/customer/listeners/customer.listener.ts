import { Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { EnumQueuePriority, HelperService, WorkerProducer } from 'lib/nest-core'
import { CUSTOMER_QUEUE_PROC_VERSION } from '../constants/customer.constant'
import { EnumCustomerEvent, EnumCustomerQueue } from '../enums/customer.enum'
import { CustomerCreatedEvent } from '../events/customer.created.event'
import { ICustomerEmailWelcomePayload } from '../interfaces/customer.interface'

@Injectable()
export class CustomerListener {
  constructor(
    private readonly producer: WorkerProducer,
    private readonly helperService: HelperService,
  ) {}

  @OnEvent(EnumCustomerEvent.CREATED, { async: true })
  async handleCustomerCreatedEvent(event: CustomerCreatedEvent): Promise<void> {
    // Welcome every new customer that has an email address (sign-up, admin create)
    if (event.payload.email) {
      await this.producer.publish<ICustomerEmailWelcomePayload>(
        EnumCustomerQueue.PROC_EMAIL_WELCOME,
        {
          version: CUSTOMER_QUEUE_PROC_VERSION[EnumCustomerQueue.PROC_EMAIL_WELCOME],
          priority: EnumQueuePriority.MEDIUM,
          startDate: this.helperService.dateNow(),
          message: {
            customerId: event.payload.id,
            customerEmail: event.payload.email,
          },
        },
      )
    }
  }
}
