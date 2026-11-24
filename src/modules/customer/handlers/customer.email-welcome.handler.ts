import { Injectable } from '@nestjs/common'
import {
  APP_LANGUAGE,
  APP_NAME,
  EnumScopeType,
  FileUtil,
  IWorkerHandler,
  LoggerService,
  MailerService,
  MessageService,
  OnScope,
} from 'lib/nest-core'
import { CUSTOMER_QUEUE_PROC_VERSION } from '../constants/customer.constant'
import { EnumCustomerQueue } from '../enums/customer.enum'
import { ICustomerEmailWelcomePayload } from '../interfaces/customer.interface'
import { CustomerService } from '../services/customer.service'

const WELCOME_TEMPLATE = 'welcome.email.html'

@Injectable()
export class CustomerEmailWelcomeHandler implements IWorkerHandler {
  topic: string = EnumCustomerQueue.PROC_EMAIL_WELCOME
  version: number = CUSTOMER_QUEUE_PROC_VERSION[EnumCustomerQueue.PROC_EMAIL_WELCOME]

  constructor(
    private readonly logger: LoggerService,
    private readonly mailer: MailerService,
    private readonly message: MessageService,
    private readonly customerService: CustomerService,
  ) {}

  @OnScope(EnumScopeType.QUEUE, {
    context: EnumCustomerQueue.PROC_EMAIL_WELCOME,
  })
  async handle(version: number, payload: ICustomerEmailWelcomePayload): Promise<void> {
    this.logger.log(`${this.topic}:v${version} is handling customer ${payload?.customerId}`)

    // Re-read the customer: the account may have been closed or the email changed since enqueue
    const customer = await this.customerService.getOne({ where: { id: payload.customerId } })
    if (!customer?.isActive || !customer.email) {
      return
    }

    const language = customer.locale || APP_LANGUAGE
    const properties: Record<string, string> = {
      appName: APP_NAME,
      name: customer.name || customer.email,
    }
    properties.subject = this.message.setMessage('email.subject.welcome', {
      customLanguage: language,
      properties,
    })

    const template = FileUtil.readTemplate(WELCOME_TEMPLATE, language)
    const html = template.replace(/\{(\w+)\}/g, (match, key: string) =>
      key in properties ? this.escapeHtml(properties[key]) : match,
    )

    // Let send errors propagate so the queue retries the job
    await this.mailer.send({ to: customer.email, subject: properties.subject, html })
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }
}
