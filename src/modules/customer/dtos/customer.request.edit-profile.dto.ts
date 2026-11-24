import { OmitType } from '@nestjs/swagger'
import { CustomerRequestSignUpDto } from './customer.request.sign-up.dto'

export class CustomerEditProfileRequestDto extends OmitType(CustomerRequestSignUpDto, [
  'password',
  'avatar',
] as const) {}
