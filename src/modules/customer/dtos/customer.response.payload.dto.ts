import { PickType } from '@nestjs/swagger'
import { CustomerResponseDetailDto } from './customer.response.detail.dto'

export class CustomerResponsePayloadDto extends PickType(CustomerResponseDetailDto, [
  'id',
  'email',
  'phone',
] as const) {}
