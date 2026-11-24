import { ApiProperty, PickType } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'
import { ToString } from 'lib/nest-core'
import { CustomerRequestSignUpDto } from './customer.request.sign-up.dto'

export class CustomerSignInRequestDto extends PickType(CustomerRequestSignUpDto, ['phone']) {
  @IsNotEmpty()
  @IsString()
  @ToString()
  @ApiProperty({ required: true, example: process.env.MOCK_CUSTOMER_PASS ?? '' })
  password: string
}
