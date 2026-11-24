export interface TDashboard {
  totalCustomers: number
  totalActiveCustomers: number
  totalNewCustomers: number
  totalNotificationsSent: number
  totalPushesSent: number
}

export interface IDashboardDateRange {
  untilDate: Date
  sinceDate: Date
}
