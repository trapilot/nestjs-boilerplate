import { ApiProperty, OmitType } from '@nestjs/swagger'
import { IsBoolean, IsOptional } from 'class-validator'
import { ToBoolean, ToString } from 'lib/nest-core'
import { IsPassword } from 'lib/nest-web'
import { UserRequestCreateDto } from './user.request.create.dto'
import { DOC_EXAMPLE } from 'app/constants/app.doc.constant'

export class UserRequestUpdateDto extends OmitType(UserRequestCreateDto, ['avatar', 'password']) {
  @IsOptional()
  @IsPassword()
  @ToString()
  @ApiProperty({ required: false, example: DOC_EXAMPLE.ADMIN_PASS })
  password: string

  @IsOptional()
  @IsBoolean()
  @ToBoolean()
  @ApiProperty({ required: false, example: true })
  isActive: boolean
}
