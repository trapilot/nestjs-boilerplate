import { registerAs } from '@nestjs/config'
import { IConfigRedis } from 'lib/nest-core'

export default registerAs(
  'redis',
  (): IConfigRedis => ({
    cache: {
      url: process.env.CACHE_REDIS_URL,
      namespace: 'Cache',
      ttl: 5 * 60 * 1000,
    },
    // Atomic shared state (request nonces, rate-limit counters); defaults to the cache server
    store: {
      url: process.env.STORE_REDIS_URL || process.env.CACHE_REDIS_URL,
      namespace: 'Store',
    },
    queue: {
      url: process.env.QUEUE_REDIS_URL,
      namespace: 'Queue',
    },
    pubsub: {
      url: process.env.PUBSUB_REDIS_URL,
      namespace: 'Pubsub',
    },
    realtime: {
      url: process.env.REALTIME_REDIS_URL,
      namespace: 'Realtime',
    },
    stream: {
      url: process.env.STREAM_REDIS_URL,
      namespace: 'Stream',
    },
  }),
)
