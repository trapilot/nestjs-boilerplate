import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, MaxLength } from 'class-validator'
import { ToString } from 'lib/nest-core'
import { IsPassword } from 'lib/nest-web'
import { CustomerRequestOTPDto } from './customer.request.verify-profile'
import { DOC_EXAMPLE } from 'app/constants/app.doc.constant'

export class CustomerResetPasswordRequestDto extends CustomerRequestOTPDto {
  @IsNotEmpty()
  @IsPassword()
  @ToString()
  @MaxLength(50)
  @ApiProperty({ required: true, example: DOC_EXAMPLE.CUSTOMER_PASS })
  password: string
}
