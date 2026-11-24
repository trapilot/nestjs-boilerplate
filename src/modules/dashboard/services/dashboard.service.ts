import { Injectable } from '@nestjs/common'
import { EnumPushResult } from '@runtime/prisma-client'
import { HelperService } from 'lib/nest-core'
import { PrismaService } from 'lib/nest-prisma'
import { TDashboard } from '../interfaces/dashboard.interface'

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helperService: HelperService,
  ) {}

  async getSummary(startDate: Date, untilDate: Date): Promise<TDashboard> {
    const startTime = this.helperService.dateCreate(startDate, { startOfDay: true })
    const untilTime = this.helperService.dateCreate(untilDate, { endOfDay: true })

    const [
      totalCustomers,
      totalActiveCustomers,
      totalNewCustomers,
      totalNotificationsSent,
      totalPushesSent,
    ] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.customer.count({ where: { isActive: true } }),
      this.prisma.customer.count({ where: { createdAt: { gte: startTime, lte: untilTime } } }),
      this.prisma.customerNotification.count({
        where: { pushedAt: { gte: startTime, lte: untilTime } },
      }),
      this.prisma.customerPush.count({
        where: { status: EnumPushResult.SENT, pushedAt: { gte: startTime, lte: untilTime } },
      }),
    ])

    return {
      totalCustomers,
      totalActiveCustomers,
      totalNewCustomers,
      totalNotificationsSent,
      totalPushesSent,
    }
  }

  async viewDataList<T>(_startDate: Date, _untilDate: Date): Promise<T[]> {
    return []
  }
}
