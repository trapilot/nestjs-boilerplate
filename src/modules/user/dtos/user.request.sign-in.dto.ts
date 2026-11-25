import { ApiHideProperty, ApiProperty, PickType } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString } from 'class-validator'
import { ToBoolean, ToString } from 'lib/nest-core'
import { UserRequestCreateDto } from './user.request.create.dto'
import { DOC_EXAMPLE } from 'app/constants/app.doc.constant'

export class UserRequestSignInDto extends PickType(UserRequestCreateDto, ['email'] as const) {
  @IsOptional()
  @IsString()
  @ToString()
  @ApiProperty({ required: true, example: DOC_EXAMPLE.ADMIN_PASS })
  password: string

  @IsOptional()
  @IsBoolean()
  @ToBoolean()
  // @ApiProperty({ required: false, example: true })
  @ApiHideProperty()
  rememberMe?: boolean
}
