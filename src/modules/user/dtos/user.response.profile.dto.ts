import { ApiProperty, IntersectionType } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'
import { ToUrl } from 'lib/nest-core'
import { IUserProfilePolicy } from '../interfaces/user.auth.interface'
import { ToUserPolicies } from '../transforms/user.policies.transform'
import { EnumRoleType } from '@runtime/prisma-client'
import { ToUserRole } from '../transforms/user.role.transform'

class ResponseUserPolicySubject {
  @ApiProperty({ example: '' })
  @Type(() => String)
  @Expose()
  path: string

  @ApiProperty({ example: '' })
  @Type(() => String)
  @Expose()
  title: string

  @ApiProperty({ example: '' })
  @Type(() => String)
  @Expose()
  context: string

  @ApiProperty({ example: '' })
  @Type(() => String)
  @Expose()
  subject: string

  @ApiProperty({ example: true })
  @Type(() => Boolean)
  @Expose()
  isVisible: boolean

  @ApiProperty({ example: ['read'] })
  @Type(() => String)
  @Expose()
  actions: string[]
}

class ResponseUserPolicy {
  @ApiProperty({ example: true })
  @Type(() => Boolean)
  @Expose()
  group: boolean

  @ApiProperty({ example: '' })
  @Type(() => String)
  @Expose()
  path: string

  @ApiProperty({ example: '' })
  @Type(() => String)
  @Expose()
  title: string

  @ApiProperty({ example: '' })
  @Type(() => String)
  @Expose()
  context: string

  @ApiProperty({ type: () => [ResponseUserPolicySubject] })
  @Type(() => ResponseUserPolicySubject)
  @Expose()
  subjects: ResponseUserPolicySubject[]
}

export class ResponseUserProfileDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @Expose()
  id: number

  @ApiProperty({ example: '' })
  @Type(() => String)
  @Expose()
  email: string

  @ApiProperty({ example: '' })
  @Type(() => String)
  @Expose()
  phone: string | null

  @ApiProperty({ example: '' })
  @Type(() => String)
  @Expose()
  name: string | null

  @ApiProperty({ example: '' })
  @Type(() => String)
  @Expose()
  address: string | null

  @ApiProperty({ example: '' })
  @Type(() => String)
  @ToUrl()
  @Expose()
  avatar: string | null

  @ApiProperty({ example: new Date() })
  @Type(() => Date)
  @Expose()
  loginDate: Date | null

  @ApiProperty({ example: new Date() })
  @Type(() => Date)
  @Expose()
  createdAt: Date
}

class ResponseUserProfileRelationDto {
  @ApiProperty({ example: 1 })
  @ToUserRole({ key: true })
  @Type(() => Number)
  @Expose()
  roleId: number

  @ApiProperty({ enum: EnumRoleType })
  @ToUserRole({ type: true })
  @Expose()
  roleType: EnumRoleType

  @ApiProperty({ type: () => [ResponseUserPolicy] })
  @ToUserPolicies()
  @Expose()
  policies: IUserProfilePolicy[]
}

export class UserProfileResponseDto extends IntersectionType(
  ResponseUserProfileDto,
  ResponseUserProfileRelationDto,
) {}
