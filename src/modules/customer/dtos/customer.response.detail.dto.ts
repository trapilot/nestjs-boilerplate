import { ApiProperty, IntersectionType, OmitType, PickType } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'
import { EnumAuthLoginFrom } from 'lib/nest-auth'
import { APP_LANGUAGE, EnumDateFormat, ToDate, ToUrl } from 'lib/nest-core'
import { ResponseUserBelongDto } from 'lib/nest-web'

class ResponseDataDetailDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @Expose()
  id: number

  @ApiProperty({ example: 'payx@email.cc.co' })
  @Type(() => String)
  @Expose()
  email: string

  @ApiProperty({ example: 'PayPay' })
  @Type(() => String)
  @Expose()
  name: string

  // @ApiProperty({ example: '852' })
  // @Type(() => String)
  // @Expose()
  // phoneRegion: string

  // @ApiProperty({ example: '987654321' })
  // @Type(() => String)
  // @Expose()
  // phoneNumber: string

  @ApiProperty({ example: '' })
  @Type(() => String)
  @Expose()
  phone: string

  @ApiProperty({ example: APP_LANGUAGE })
  @Type(() => String)
  @Expose()
  locale: string

  @Type(() => String)
  @ToUrl()
  @Expose()
  avatar: string

  // @ApiProperty({ enum: EnumUserType, enumName: 'EnumUserType', enumName: 'EnumUserType' })
  // @Type(() => String)
  // @Expose()
  // gender: EnumUserType

  @ApiProperty({ example: 'home #01' })
  @Type(() => String)
  @Expose()
  address: string

  @ApiProperty({ example: null })
  @ToDate({ format: EnumDateFormat.DATE })
  @Expose()
  birthDate: Date

  @Type(() => Boolean)
  @Expose()
  isEmailVerified: boolean

  @Type(() => Boolean)
  @Expose()
  isPhoneVerified: boolean

  @Type(() => Boolean)
  @Expose()
  isNotifiable: boolean

  @Type(() => Boolean)
  @Expose()
  isPromotable: boolean

  @ApiProperty({ example: true })
  @Type(() => Boolean)
  @Expose({ groups: [EnumAuthLoginFrom.CMS] })
  isActive: boolean

  @ApiProperty({ example: new Date(Date.now() - 30000 * 3600) })
  @Type(() => Date)
  @Expose({ groups: [EnumAuthLoginFrom.CMS] })
  createdAt: Date

  @ApiProperty({ example: new Date(Date.now() - 1000 * 3600) })
  @Type(() => Date)
  @Expose({ groups: [EnumAuthLoginFrom.CMS] })
  updatedAt: Date
}

class ResponseDataRelationDto extends ResponseUserBelongDto {}

export class CustomerResponseDetailDto extends IntersectionType(
  ResponseDataDetailDto,
  ResponseDataRelationDto,
) {}

export class CustomerResponseListDto extends IntersectionType(
  OmitType(ResponseDataDetailDto, [] as const),
  ResponseDataRelationDto,
) {}

export class CustomerResponseBelongDto extends PickType(CustomerResponseDetailDto, [
  'id',
  'name',
  'phone',
  'avatar',
] as const) {}
