import { EnumRoleType } from '@runtime/prisma-client'
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator'

// Metadata DTOs are validated with `forbidNonWhitelisted`: unknown keys are rejected, so secrets
// (passwords, tokens, keys) or large objects can never slip into a row. Keep metadata to ids,
// names and small flags.

export class ActivityLogEmptyMetadataDto {}

/** A managed resource (api key, content, setting, ...). */
export class ActivityLogResourceMetadataDto {
  @IsInt()
  id: number

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class ActivityLogRoleMetadataDto {
  @IsInt()
  id: number

  @IsString()
  @MaxLength(255)
  name: string

  @IsEnum(EnumRoleType)
  type: EnumRoleType

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

/** Actor row of an admin acting on a customer. */
export class ActivityLogCustomerTargetMetadataDto {
  @IsInt()
  customerId: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

/** Actor row of an admin acting on a staff user. */
export class ActivityLogUserTargetMetadataDto {
  @IsInt()
  userId: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

/** Target row written on the affected account when an admin acted on it. */
export class ActivityLogActorMetadataDto {
  @IsInt()
  actorUserId: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
