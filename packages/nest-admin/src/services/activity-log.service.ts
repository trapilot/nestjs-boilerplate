/* AUTO-GENERATED FILE. DO NOT EDIT. */

import { _privateAxios, _publicAxios } from '../lib/httpClient'
import type { components as _components } from '../types/api'

type RequestOptions = { query?: Record<string, unknown>; config?: any }

export const activityLogService = {
  listMine: async <T = _components['schemas']['ActivityLogResponseDetailDto'][]>(options?: RequestOptions): Promise<T> => {
    const query = options?.query || {}
const search = new URLSearchParams()
Object.entries(query).forEach(([k, v]) => {
  if (v === undefined || v === null) return
  if (Array.isArray(v)) v.forEach((vv) => search.append(k, String(vv)))
  else search.append(k, String(v))
})
const qs = search.toString()
    const baseUrl = "/activity-logs/me"
    const url = qs ? baseUrl + '?' + qs : baseUrl
    const client = _privateAxios
    const config = options?.config || {}
    const data = await client.get(url, config)
    return data as T
  },
  listByUser: async <T = _components['schemas']['ActivityLogResponseDetailDto'][]>(params: { userId: string | number }, options?: RequestOptions): Promise<T> => {
    const query = options?.query || {}
const search = new URLSearchParams()
Object.entries(query).forEach(([k, v]) => {
  if (v === undefined || v === null) return
  if (Array.isArray(v)) v.forEach((vv) => search.append(k, String(vv)))
  else search.append(k, String(v))
})
const qs = search.toString()
    const baseUrl = "/activity-logs/users/" + String(params.userId)
    const url = qs ? baseUrl + '?' + qs : baseUrl
    const client = _privateAxios
    const config = options?.config || {}
    const data = await client.get(url, config)
    return data as T
  },
  listByCustomer: async <T = _components['schemas']['ActivityLogResponseDetailDto'][]>(params: { customerId: string | number }, options?: RequestOptions): Promise<T> => {
    const query = options?.query || {}
const search = new URLSearchParams()
Object.entries(query).forEach(([k, v]) => {
  if (v === undefined || v === null) return
  if (Array.isArray(v)) v.forEach((vv) => search.append(k, String(vv)))
  else search.append(k, String(v))
})
const qs = search.toString()
    const baseUrl = "/activity-logs/customers/" + String(params.customerId)
    const url = qs ? baseUrl + '?' + qs : baseUrl
    const client = _privateAxios
    const config = options?.config || {}
    const data = await client.get(url, config)
    return data as T
  },
}
