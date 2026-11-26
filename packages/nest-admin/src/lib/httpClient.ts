import axios, { AxiosError, AxiosResponse } from 'axios'
import { ENV } from '../config/env'
import { getAccessToken, setAccessToken, setRefreshToken } from '../hooks/useAuthToken'
import i18n, { LANGUAGES } from '../i18n'
import { createCorrelationId } from '../utils/crypto'
import { getTimezone } from '../utils/time'
import { ApiError } from './apiError'
import { attachSecurityHeaders, readSecurityHeaders, shouldRetrySecurity } from './requestSecurity'
import { setLastMetadata } from './responseMetadata'

// --- API Response Type Definitions ---

interface IBaseMetadata {
  path: string
  language: string
  timezone: string
  version: string
  timestamp: number
}

interface IListMetadata extends IBaseMetadata {
  availableSearch?: string[]
  availableOrderBy?: string[]
}

interface IPaginateMetadata extends IListMetadata {
  pagination?: {
    page: number
    perPage: number
    totalPage: number
    totalRecord: number
  }
}

type TMetadata = IBaseMetadata | IListMetadata | IPaginateMetadata

interface ISuccessResponse<T> {
  success: true
  metadata: TMetadata
  result: T
}

interface IErrorResponse {
  success: false
  metadata: TMetadata
  error: {
    message: string
    code: string
    error: string
  }
}

type IResponseBody<T = any> = ISuccessResponse<T> | IErrorResponse

// --- Axios Instance Setup ---

// Common header injector (security headers last: a signature covers the final body)
async function attachCommonHeaders(config: any) {
  config.headers = config.headers || {}

  let language: string | null = i18n.language || LANGUAGES[0]

  try {
    const storedLang = localStorage.getItem('language')
    if (storedLang) {
      language = storedLang
    }
  } catch {}

  config.headers['x-language'] = language
  config.headers['x-timezone'] = getTimezone()
  config.headers['x-version'] = ENV.version
  if (!config.headers['x-correlation-id']) {
    config.headers['x-correlation-id'] = createCorrelationId()
  }
  if (!ENV.tenantId) {
    config.headers['x-tenant-id'] = ENV.tenantId
  }

  return attachSecurityHeaders(config)
}

// --- Axios Instances ---
const privateAxios = axios.create({
  baseURL: ENV.apiBaseURL,
  withCredentials: false,
})
const publicAxios = axios.create({
  baseURL: ENV.apiBaseURL,
  withCredentials: false,
})

// --- Refresh Token Logic ---
// The refresh call lives in src/api/auth.ts, which imports this module; it registers itself here
// to keep the dependency one-directional.
type RefreshHandler = () => Promise<{ accessToken: string; refreshToken?: string }>
let refreshHandler: RefreshHandler | null = null
export function registerRefreshHandler(handler: RefreshHandler) {
  refreshHandler = handler
}

let isRefreshing = false
let failedQueue: any[] = []
function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  failedQueue = []
}

publicAxios.interceptors.request.use(attachCommonHeaders)
publicAxios.interceptors.response.use(handleResponse, (error: AxiosError) => {
  readSecurityHeaders(error?.response?.headers)
  // 412: the API wants other security headers (or a corrected clock); the headers above taught
  // us which, so retry once with fresh ones
  if (shouldRetrySecurity(error?.response?.status, error.config)) {
    return publicAxios(error.config as any)
  }
  return Promise.reject(error)
})

privateAxios.interceptors.request.use(async (config) => {
  config = await attachCommonHeaders(config)
  const token = getAccessToken()
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})
privateAxios.interceptors.response.use(
  handleResponse, // Use the same success handler for private requests
  async (error: AxiosError) => {
    const originalRequest = error.config

    readSecurityHeaders(error?.response?.headers)
    // 412: retry once with fresh security headers (see publicAxios)
    if (shouldRetrySecurity(error?.response?.status, originalRequest)) {
      return privateAxios(originalRequest as any)
    }

    // Handle 401 Unauthorized for token refresh
    if (error?.response?.status === 401 && originalRequest && !(originalRequest as any)._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest && originalRequest.headers && token) {
              ;(originalRequest as any).headers['Authorization'] = 'Bearer ' + token
            }
            return privateAxios(originalRequest as any)
          })
          .catch((err) => Promise.reject(err))
      }

      ;(originalRequest as any)._retry = true
      isRefreshing = true

      try {
        if (!refreshHandler) throw error
        const { accessToken, refreshToken } = await refreshHandler()
        setAccessToken(accessToken)
        if (refreshToken) setRefreshToken(refreshToken)
        processQueue(null, accessToken)
        if (originalRequest && originalRequest.headers) {
          ;(originalRequest as any).headers['Authorization'] = 'Bearer ' + accessToken
        }
        return privateAxios(originalRequest as any)
      } catch (err: unknown) {
        processQueue(err, null)
        // Clear tokens and redirect to login on refresh failure
        setAccessToken('')
        window.location.href = `${import.meta.env.BASE_URL}login`
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    // For non-401 errors, just forward the normalized error
    return Promise.reject(error)
  },
)

// Centralized response handler
function handleResponse(response: AxiosResponse<IResponseBody>) {
  readSecurityHeaders(response.headers)
  const responseBody = response.data
  if (responseBody.success) {
    // Capture metadata globally for downstream usage (e.g., pagination)
    try {
      setLastMetadata(responseBody.metadata as any)
    } catch {}
    return responseBody.result
  } else {
    return Promise.reject(new ApiError({ ...responseBody.error, status: response.status }))
  }
}

export const setCorrelationId = (correlationId: string) => {
  privateAxios.defaults.headers.common['x-correlation-id'] = correlationId
  publicAxios.defaults.headers.common['x-correlation-id'] = correlationId
}

export { privateAxios as _privateAxios, publicAxios as _publicAxios }
