import { EnumCustomerEvent } from '../enums/customer.enum'
import { TCustomer } from '../interfaces/customer.interface'

export class CustomerCreatedEvent {
  topic: string = EnumCustomerEvent.CREATED
  version: number = 1
  occurredAt: Date = new Date()

  constructor(public readonly payload: TCustomer) {}
}
