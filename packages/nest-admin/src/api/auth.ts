import { _privateAxios, _publicAxios, registerRefreshHandler } from '../lib/httpClient'
import { getRefreshToken } from '../hooks/useAuthToken'
import type { components } from '../types/api'

type Schemas = components['schemas']

export type LoginResult = Schemas['AuthResponseLoginDto']
export type TokenResult = Schemas['AuthResponseTokenDto']
export type ProfileResult = Schemas['UserProfileResponseDto']

/** POST /auth/login (public). */
export async function login(body: Schemas['UserRequestSignInDto']): Promise<LoginResult> {
  return (await _publicAxios.post('/auth/login', body)) as LoginResult
}

/** GET /auth/_me. */
export async function me<T = ProfileResult>(): Promise<T> {
  return (await _privateAxios.get('/auth/_me')) as T
}

/**
 * POST /auth/refresh. The endpoint is guarded by the refresh token, so it is sent as the bearer
 * credential on the public client (the private client would attach the expired access token and
 * re-enter its own 401 handler).
 */
export async function refresh(): Promise<TokenResult> {
  const token = getRefreshToken()
  return (await _publicAxios.post('/auth/refresh', undefined, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })) as TokenResult
}

/** PUT /auth/edit-profile. */
export async function editProfile(
  body: Schemas['UserEditProfileRequestDto'],
): Promise<ProfileResult> {
  return (await _privateAxios.put('/auth/edit-profile', body)) as ProfileResult
}

/** PUT /auth/change-password. */
export async function changePassword(
  body: Schemas['UserRequestChangePasswordDto'],
): Promise<ProfileResult> {
  return (await _privateAxios.put('/auth/change-password', body)) as ProfileResult
}

// httpClient cannot import this module (circular), so the refresh call is registered instead.
registerRefreshHandler(refresh)
