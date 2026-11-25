import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'
import { ToString } from 'lib/nest-core'
import { IsEmail, IsPhone } from 'lib/nest-web'
import { DOC_EXAMPLE } from 'app/constants/app.doc.constant'

export class CustomerRequestOTPDto {
  @IsNotEmpty()
  @IsPhone()
  @ToString()
  @ApiProperty({ required: true, example: DOC_EXAMPLE.CUSTOMER_PHONE })
  phone: string
}

export class CustomerRequestTokenDto {
  @IsNotEmpty()
  @IsEmail()
  @ToString({ format: 'lowercase' })
  @ApiProperty({ required: false, example: DOC_EXAMPLE.CUSTOMER_EMAIL })
  email: string
}
