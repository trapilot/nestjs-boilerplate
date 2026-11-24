import { OmitType } from '@nestjs/swagger'
import { CustomerRequestCreateDto } from './customer.request.create.dto'

export class CustomerRequestSignUpDto extends OmitType(CustomerRequestCreateDto, [
  'isActive',
] as const) {}
