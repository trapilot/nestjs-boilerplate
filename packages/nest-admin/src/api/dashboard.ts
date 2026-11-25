import { _privateAxios } from '../lib/httpClient'
import type { components } from '../types/api'

type Schemas = components['schemas']

export type DashboardSummary = Schemas['DashboardSummaryResponseDto']

/** GET /dashboard/view-summary. */
export async function getSummary(): Promise<DashboardSummary> {
  return (await _privateAxios.get('/dashboard/view-summary')) as DashboardSummary
}

/** GET /dashboard/refresh-summary. */
export async function refreshSummary(): Promise<DashboardSummary> {
  return (await _privateAxios.get('/dashboard/refresh-summary')) as DashboardSummary
}

/** GET /dashboard/view-data-list. */
export async function viewDataList(): Promise<Schemas['DashboardDataResponseDto']> {
  return (await _privateAxios.get(
    '/dashboard/view-data-list',
  )) as Schemas['DashboardDataResponseDto']
}
