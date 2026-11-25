import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'
import { ToString } from 'lib/nest-core'
import { DOC_EXAMPLE } from 'app/constants/app.doc.constant'

export class UserRequestChangeConfirmPasswordDto {
  @IsNotEmpty()
  @ToString()
  @ApiProperty({
    required: true,
    description: 'new confirm password',
    example: DOC_EXAMPLE.ADMIN_PASS,
  })
  password: string
}
