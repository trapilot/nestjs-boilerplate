import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'
import { ToString } from 'lib/nest-core'
import { IsEmail, IsPhone } from 'lib/nest-web'

export class CustomerRequestOTPDto {
  @IsNotEmpty()
  @IsPhone()
  @ToString()
  @ApiProperty({ required: true, example: process.env.MOCK_CUSTOMER_PHONE })
  phone: string
}

export class CustomerRequestTokenDto {
  @IsNotEmpty()
  @IsEmail()
  @ToString({ format: 'lowercase' })
  @ApiProperty({ required: false, example: process.env.MOCK_CUSTOMER_EMAIL })
  email: string
}
