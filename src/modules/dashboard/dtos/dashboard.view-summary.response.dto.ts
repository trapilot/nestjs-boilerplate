import { ApiProperty } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'

export class DashboardSummaryResponseDto {
  @ApiProperty({ example: 100, description: 'All customers (not date-bound)' })
  @Type(() => Number)
  @Expose()
  totalCustomers: number

  @ApiProperty({ example: 80, description: 'Active customers (not date-bound)' })
  @Type(() => Number)
  @Expose()
  totalActiveCustomers: number

  @ApiProperty({ example: 10, description: 'Customers created in the date range' })
  @Type(() => Number)
  @Expose()
  totalNewCustomers: number

  @ApiProperty({ example: 25, description: 'Customer notifications pushed in the date range' })
  @Type(() => Number)
  @Expose()
  totalNotificationsSent: number

  @ApiProperty({ example: 40, description: 'Push messages sent successfully in the date range' })
  @Type(() => Number)
  @Expose()
  totalPushesSent: number
}
