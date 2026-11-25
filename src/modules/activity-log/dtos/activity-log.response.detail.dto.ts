import { ApiProperty } from '@nestjs/swagger'
import { EnumActivityLogAction, EnumActivityLogOwnerType } from '../enums/activity-log.enum'
import { Expose, Transform, Type } from 'class-transformer'
import { EnumAuthLoginFrom, EnumAuthScopeType } from 'lib/nest-auth'

export class ActivityLogOwnerDto {
  @ApiProperty({ example: 1 })
  id: number

  // Display name: the account's name, or its email when no name is set
  @ApiProperty({ example: 'John Doe', required: false })
  name: string | null

  @ApiProperty({ example: 'john@example.com', required: false })
  email: string | null
}

export class ActivityLogResponseDetailDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @Expose()
  id: number

  @ApiProperty({ enum: EnumActivityLogAction, enumName: 'EnumActivityLogAction' })
  @Expose()
  action: EnumActivityLogAction

  // A row belongs to exactly one owner: a staff User (userId) or a Customer (customerId)
  @ApiProperty({ enum: EnumActivityLogOwnerType, enumName: 'EnumActivityLogOwnerType' })
  @Transform(({ obj }) =>
    obj?.userId ? EnumActivityLogOwnerType.USER : EnumActivityLogOwnerType.CUSTOMER,
  )
  @Expose()
  ownerType: EnumActivityLogOwnerType

  // The account the row belongs to; only exposed to the CMS (never to the app)
  @ApiProperty({ type: () => ActivityLogOwnerDto, required: false })
  @Transform(({ obj }) => {
    const owner = obj?.user ?? obj?.customer
    if (!owner) {
      return null
    }
    return { id: owner.id, name: owner.name ?? owner.email ?? null, email: owner.email ?? null }
  })
  @Expose({ groups: [EnumAuthLoginFrom.CMS, EnumAuthScopeType.USER] })
  owner: ActivityLogOwnerDto | null

  @ApiProperty({ example: 'Logged in with password' })
  @Expose()
  description: string

  @ApiProperty({ example: { id: 1 }, required: false })
  @Expose()
  metadata: Record<string, unknown> | null

  @ApiProperty({ example: '127.0.0.1', required: false })
  @Expose()
  ipAddress: string | null

  @ApiProperty({ example: { os: { name: 'iOS' } }, required: false })
  @Expose()
  userAgent: Record<string, unknown> | null

  // Id of the request that produced the row: filter by it to see everything done in that request
  @ApiProperty({ example: '019a3f0e-7c1b-7d3e-9a2b-4f5e6d7c8b9a', required: false })
  @Expose({ groups: [EnumAuthLoginFrom.CMS, EnumAuthScopeType.USER] })
  correlationId: string | null

  @ApiProperty({ example: new Date() })
  @Expose()
  createdAt: Date

  // Name of the admin who acted; only exposed to the CMS (never to the app)
  @ApiProperty({ example: 'Admin', required: false })
  @Transform(({ obj }) => obj?.createdByUser?.name ?? obj?.createdByUser?.email ?? null)
  @Expose({ groups: [EnumAuthLoginFrom.CMS, EnumAuthScopeType.USER] })
  createdBy: string | null
}
