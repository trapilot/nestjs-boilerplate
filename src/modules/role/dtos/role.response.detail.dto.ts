import { ApiProperty, IntersectionType, OmitType, PickType } from '@nestjs/swagger'
import { EnumRoleType } from '@runtime/prisma-client'
import { Expose, Type } from 'class-transformer'
import { ResponseUserBelongDto } from 'lib/nest-web'
import { IRoleResponseTransform } from '../interfaces/role.interface'
import { ToRolePolicies } from '../transforms/role.policies.transform'

class ResponseDataDetailDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @Expose()
  id: number

  @Type(() => String)
  @Expose()
  name: string

  @ApiProperty({ enum: EnumRoleType })
  @Expose()
  type: EnumRoleType

  @Type(() => String)
  @Expose()
  description?: string

  @Type(() => Boolean)
  @Expose()
  isActive: boolean

  @Type(() => Date)
  @Expose()
  createdAt: Date

  @Type(() => Date)
  @Expose()
  updatedAt: Date
}

class ResponseDataRelationDto extends ResponseUserBelongDto {
  @ToRolePolicies()
  @Expose()
  policies: IRoleResponseTransform[]
}

export class RoleResponseDetailDto extends IntersectionType(
  ResponseDataDetailDto,
  ResponseDataRelationDto,
) {}

export class RoleResponseListDto extends IntersectionType(
  OmitType(ResponseDataDetailDto, [] as const),
  ResponseDataRelationDto,
) {}

export class RoleResponseBelongDto extends IntersectionType(
  PickType(ResponseDataDetailDto, ['id', 'name', 'type', 'isActive'] as const),
  ResponseDataRelationDto,
) {}
