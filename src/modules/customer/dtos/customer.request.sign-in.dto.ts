import { ApiProperty, PickType } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'
import { ToString } from 'lib/nest-core'
import { CustomerRequestSignUpDto } from './customer.request.sign-up.dto'
import { DOC_EXAMPLE } from 'app/constants/app.doc.constant'

export class CustomerSignInRequestDto extends PickType(CustomerRequestSignUpDto, ['phone']) {
  @IsNotEmpty()
  @IsString()
  @ToString()
  @ApiProperty({ required: true, example: DOC_EXAMPLE.CUSTOMER_PASS })
  password: string
}
