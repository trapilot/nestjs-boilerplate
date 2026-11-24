import { ApiProperty, IntersectionType, OmitType } from '@nestjs/swagger'
import {
  EnumAuthAbilityAction,
  EnumAuthAbilityContext,
  EnumAuthAbilitySubject,
} from 'app/enums/user.enum'
import { Expose, Type } from 'class-transformer'
import { ResponseLocaleDto, ResponseUserBelongDto } from 'lib/nest-web'
import { ToPolicyActions } from '../transforms/policy.actions.transform'

class ResponseDataDetailDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @Expose()
  id: number

  @Type(() => String)
  @Expose()
  path: string

  @Type(() => String)
  @Expose()
  context: EnumAuthAbilityContext

  @Type(() => ResponseLocaleDto)
  @Expose()
  title: ResponseLocaleDto

  @Type(() => String)
  @Expose()
  subject: EnumAuthAbilitySubject

  @ToPolicyActions()
  @Expose()
  actions: EnumAuthAbilityAction[]

  @Type(() => Boolean)
  @Expose()
  isVisible: boolean

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

export class PolicyResponseDetailDto extends IntersectionType(
  ResponseDataDetailDto,
  ResponseUserBelongDto,
) {}

export class PolicyResponseListDto extends IntersectionType(
  OmitType(ResponseDataDetailDto, [] as const),
  ResponseUserBelongDto,
) {}
