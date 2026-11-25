import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'
import { ToString } from 'lib/nest-core'
import { IsPassword } from 'lib/nest-web'
import { DOC_EXAMPLE } from 'app/constants/app.doc.constant'

export class UserRequestChangePasswordDto {
  @IsNotEmpty()
  @IsPassword()
  @ToString()
  @ApiProperty({
    required: true,
    description: "new string password, newPassword can't same with oldPassword",
    example: DOC_EXAMPLE.ADMIN_PASS,
  })
  newPassword: string

  @IsNotEmpty()
  @IsString()
  @ToString()
  @ApiProperty({
    required: true,
    description: 'old string password',
    example: DOC_EXAMPLE.ADMIN_PASS,
  })
  oldPassword: string
}
