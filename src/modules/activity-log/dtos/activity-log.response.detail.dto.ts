import { ApiProperty } from '@nestjs/swagger'
import { EnumActivityLogAction } from '../enums/activity-log.enum'
import { Expose, Transform, Type } from 'class-transformer'
import { EnumAuthLoginFrom, EnumAuthScopeType } from 'lib/nest-auth'

export class ActivityLogResponseDetailDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @Expose()
  id: number

  @ApiProperty({ enum: EnumActivityLogAction, enumName: 'EnumActivityLogAction' })
  @Expose()
  action: EnumActivityLogAction

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

  @ApiProperty({ example: new Date() })
  @Expose()
  createdAt: Date

  // Name of the admin who acted; only exposed to the CMS (never to the app)
  @ApiProperty({ example: 'Admin', required: false })
  @Transform(({ obj }) => obj?.createdByUser?.name ?? obj?.createdByUser?.email ?? null)
  @Expose({ groups: [EnumAuthLoginFrom.CMS, EnumAuthScopeType.USER] })
  createdBy: string | null
}
