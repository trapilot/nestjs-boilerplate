import { registerAs } from '@nestjs/config'
import { AppUtil, FileUtil, IConfigRequest, StrUtil } from 'lib/nest-core'

// Format is checked by AppEnvDto at boot
type TDuration = Parameters<typeof AppUtil.ms>[0]

export default registerAs(
  'request',
  (): IConfigRequest => ({
    body: {
      json: {
        limitInBytes: FileUtil.kilobytes(500),
      },
      text: {
        limitInBytes: FileUtil.megabytes(1),
      },
      urlencoded: {
        limitInBytes: FileUtil.megabytes(1),
      },
      applicationOctetStream: {
        limitInBytes: FileUtil.megabytes(10),
      },
    },
    cors: {
      allowedOrigin: process.env.CORS_ALLOWED_ORIGIN?.split(',') ?? '*',
      allowedMethods: ['GET', 'DELETE', 'PUT', 'PATCH', 'POST', 'HEAD'],
      exposedHeaders: [
        'Content-Disposition',
        'Content-Language',
        'Content-Type',
        'x-security-mode', // RequestSecurityGuard: what the client must send
        'x-server-time', // RequestSecurityGuard: server clock (epoch ms) for x-timestamp
      ],
      allowedHeaders: [
        'Accept',
        'Accept-Language',
        'Content-Language',
        'Content-Type',
        'Origin',
        'Authorization',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers',
        'Access-Control-Allow-Headers',
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Methods',
        'Access-Control-Allow-Credentials',
        'Access-Control-Expose-Headers',
        'Access-Control-Max-Age',
        'Referer',
        'Host',
        'X-Requested-With',
        'X-Response-Time',
        'user-agent',
        'x-api-key',
        'x-user-otp',
        'x-user-ott',
        'x-user-type',
        'x-user-hmac',
        'x-user-agent',
        'x-user-token',
        'x-user-version',
        'x-request-id',
        'x-correlation-id',
        'x-timezone',
        'x-language',
        'x-version',
        'x-timestamp',
        'x-nonce',
        'x-signature',
        'x-body-hash',
        'x-repo-version',
        'x-tenant-id',
      ],
    },
    cachePrefix: 'API_CACHE',
    timeoutInMs: AppUtil.ms('10s'), // 10s based on ms module
    // x-nonce / x-timestamp / x-signature checks; nonces are stored in the Redis store
    security: {
      enable: StrUtil.isTrue(process.env.REQUEST_SECURITY_ENABLED),
      key: process.env.MIDDLEWARE_SECURITY_KEY, // required when enabled (validated at boot)
      ttl: AppUtil.ms((process.env.REQUEST_SECURITY_TTL || '5m') as TDuration),
    },
    // Global rate limit; counters are shared across instances via the Redis store
    throttle: {
      ttl: AppUtil.ms((process.env.REQUEST_THROTTLE_TTL || '500ms') as TDuration),
      limit: Number(process.env.REQUEST_THROTTLE_LIMIT || 5), // max requests per window
    },
  }),
)
