import { ApiProperty, OmitType } from '@nestjs/swagger'
import { IsOptional } from 'class-validator'
import { ToString } from 'lib/nest-core'
import { IsPassword } from 'lib/nest-web'
import { CustomerRequestCreateDto } from './customer.request.create.dto'

export class CustomerRequestUpdateDto extends OmitType(CustomerRequestCreateDto, [
  'password',
  'avatar',
] as const) {
  @IsOptional()
  @IsPassword()
  @ToString()
  @ApiProperty({ required: true, example: process.env.MOCK_CUSTOMER_PASS })
  password: string
}
