import { ApiHideProperty, ApiProperty } from '@nestjs/swagger'
import { EnumRoleType } from '@runtime/prisma-client'
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator'
import { ToArray, ToBoolean, ToString } from 'lib/nest-core'
import { RolePolicyRequestCreateDto } from './role-policy.request.create.dto'

export class RoleRequestCreateDto {
  @IsOptional()
  @IsString()
  @ToString()
  @MinLength(3)
  @MaxLength(30)
  // @ApiProperty({ required: true, example: 'ADMIN' })
  @ApiHideProperty()
  code: string

  @IsNotEmpty()
  @IsString()
  @ToString()
  @MinLength(3)
  @MaxLength(30)
  @ApiProperty({ required: true, example: 'ADMIN' })
  name: string

  @IsOptional()
  @IsEnum(EnumRoleType)
  @ApiProperty({ required: false, enum: EnumRoleType, example: EnumRoleType.USER })
  type?: EnumRoleType

  @IsOptional()
  @IsString()
  @ToString()
  @ApiProperty({ required: false })
  description: string | null

  @IsNotEmpty()
  @IsBoolean()
  @ToBoolean()
  @ApiProperty({ required: true, example: true })
  isActive: boolean

  @IsOptional()
  @IsArray()
  @ToArray({ type: RolePolicyRequestCreateDto })
  @ApiProperty({ required: true, isArray: true, type: () => RolePolicyRequestCreateDto })
  policies?: RolePolicyRequestCreateDto[]
}
