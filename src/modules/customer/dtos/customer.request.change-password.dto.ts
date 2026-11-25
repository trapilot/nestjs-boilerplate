import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'
import { ToString } from 'lib/nest-core'
import { IsPassword } from 'lib/nest-web'
import { DOC_EXAMPLE } from 'app/constants/app.doc.constant'

export class CustomerChangePasswordRequestDto {
  @IsNotEmpty()
  @IsPassword()
  @ToString()
  @ApiProperty({ required: true, example: DOC_EXAMPLE.CUSTOMER_PASS })
  newPassword: string

  @IsNotEmpty()
  @IsString()
  @ToString()
  @ApiProperty({ required: true, example: DOC_EXAMPLE.CUSTOMER_PASS })
  oldPassword: string
}
