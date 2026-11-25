import { ApiProperty, OmitType } from '@nestjs/swagger'
import { IsOptional } from 'class-validator'
import { ToString } from 'lib/nest-core'
import { IsPassword } from 'lib/nest-web'
import { CustomerRequestCreateDto } from './customer.request.create.dto'
import { DOC_EXAMPLE } from 'app/constants/app.doc.constant'

export class CustomerRequestUpdateDto extends OmitType(CustomerRequestCreateDto, [
  'password',
  'avatar',
] as const) {
  @IsOptional()
  @IsPassword()
  @ToString()
  @ApiProperty({ required: true, example: DOC_EXAMPLE.CUSTOMER_PASS })
  password: string
}
