import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'
import { ToString } from 'lib/nest-core'
import { DOC_EXAMPLE } from 'app/constants/app.doc.constant'

export class UserVerifyPasswordRequestDto {
  @IsNotEmpty()
  @IsString()
  @ToString()
  @ApiProperty({ required: true, example: DOC_EXAMPLE.ADMIN_PASS })
  password: string
}
