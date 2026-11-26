import axios, { AxiosHeaders, InternalAxiosRequestConfig, RawAxiosResponseHeaders } from 'axios'
import { ENV } from '../config/env'
import { generateNonce } from '../utils/crypto'

/**
 * Client side of the API's RequestSecurityGuard. Every guarded response says what the API wants
 * in `x-security-mode` and carries its clock in `x-server-time` (epoch ms):
 * - `none`: nothing extra
 * - `nonce`: x-nonce + x-timestamp (admin routes)
 * - `signature`: also x-body-hash + x-signature
 *     x-body-hash = hex(sha256(text body, UTF-8))  (sha256 of "" without a body, for multipart
 *     and for binary bodies: the API covers JSON / urlencoded / text only)
 *     x-signature = hex(hmac_sha256(key, METHOD\nPATH?QUERY\nNONCE\nTIMESTAMP\nBODY_HASH))
 */
export type TSecurityMode = 'none' | 'nonce' | 'signature'

const MODES: TSecurityMode[] = ['none', 'nonce', 'signature']
const SECURITY_HEADERS = ['x-nonce', 'x-timestamp', 'x-body-hash', 'x-signature']

// Unknown until the first response: send nonce + timestamp, which every mode but `none` needs
let securityMode: TSecurityMode | null = null
// Server clock minus device clock, so x-timestamp stays inside the API's window on a wrong clock
let clockOffsetMs = 0

/** Learn the mode and the clock offset from a response (success or error) */
export function readSecurityHeaders(headers?: RawAxiosResponseHeaders | AxiosHeaders) {
  if (!headers) return

  const mode = headers['x-security-mode'] as TSecurityMode
  if (MODES.includes(mode)) securityMode = mode

  const serverTime = Number(headers['x-server-time'])
  if (Number.isSafeInteger(serverTime) && serverTime > 0) clockOffsetMs = serverTime - Date.now()
}

/** Set fresh security headers on a request (also on a retry, which must not reuse a nonce) */
export async function attachSecurityHeaders(config: InternalAxiosRequestConfig) {
  SECURITY_HEADERS.forEach((name) => config.headers.delete(name))

  if (securityMode === 'none') return config

  const nonce = generateNonce()
  const timestamp = String(Date.now() + clockOffsetMs)
  config.headers.set('x-nonce', nonce)
  config.headers.set('x-timestamp', timestamp)

  if (securityMode !== 'signature') return config

  if (!ENV.requestSecurityKey) {
    throw new Error('The API requires signed requests but VITE_REQUEST_SECURITY_KEY is not set')
  }
  if (!window.crypto?.subtle) {
    throw new Error('Signed requests need Web Crypto (HTTPS or localhost)')
  }

  const bodyHash = toHex(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(bodyText(config))),
  )
  const payload = [
    (config.method || 'get').toUpperCase(),
    requestPath(config),
    nonce,
    timestamp,
    bodyHash,
  ].join('\n')

  config.headers.set('x-body-hash', bodyHash)
  config.headers.set('x-signature', await hmacSha256Hex(ENV.requestSecurityKey, payload))

  return config
}

/** Whether a failed request should be retried once with fresh security headers */
export function shouldRetrySecurity(status: number | undefined, config: any): boolean {
  if (status !== 412 || !config || config._securityRetry) return false
  config._securityRetry = true
  return true
}

/**
 * The text body that will be sent (the API hashes it as UTF-8). A plain object is serialized
 * here (axios would do it later, after the hash) and sent as that string. Multipart and binary
 * bodies are not covered by the API's hash, so they count as empty.
 */
function bodyText(config: InternalAxiosRequestConfig): string {
  const data = config.data

  if (data === undefined || data === null) return ''
  if (typeof data === 'string') return data
  if (data instanceof URLSearchParams) return data.toString()
  if (
    data instanceof FormData ||
    data instanceof Blob ||
    data instanceof ArrayBuffer ||
    ArrayBuffer.isView(data)
  ) {
    return ''
  }

  const json = JSON.stringify(data)
  config.data = json
  config.headers.setContentType('application/json')
  return json
}

/** Path and query as the browser sends them, which is what the API signs (req.originalUrl) */
function requestPath(config: InternalAxiosRequestConfig): string {
  const url = new URL(axios.getUri(config), window.location.href)
  return `${url.pathname}${url.search}`
}

async function hmacSha256Hex(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return toHex(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data)))
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('')
}
