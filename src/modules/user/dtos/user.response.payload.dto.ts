import { IntersectionType, PickType } from '@nestjs/swagger'
import { EnumRoleType } from '@runtime/prisma-client'
import { Expose } from 'class-transformer'
import { IAuthPayloadPolicy } from 'lib/nest-auth'
import {
  ToUserPayloadPolicies,
  ToUserPayloadRoleId,
  ToUserPayloadRoleType,
} from '../transforms/user.payload.transform'
import { UserProfileResponseDto } from './user.response.profile.dto'

export class ResponseUserPayloadDto extends PickType(UserProfileResponseDto, [
  'id',
  'email',
  'phone',
  'loginDate',
] as const) {}

class ResponseUserPayloadRelationDto {
  @ToUserPayloadRoleType()
  @Expose()
  roleType: EnumRoleType | null

  @ToUserPayloadRoleId()
  @Expose()
  roleId: number | null

  @ToUserPayloadPolicies()
  @Expose()
  policies: IAuthPayloadPolicy[]
}

export class UserResponsePayloadDto extends IntersectionType(
  ResponseUserPayloadDto,
  ResponseUserPayloadRelationDto,
) {}
