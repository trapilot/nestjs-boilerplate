import { Logger } from '@nestjs/common'
import { ThrottlerStorage } from '@nestjs/throttler'
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface'
import { RedisStoreService } from 'lib/nest-core'

/**
 * Fixed-window counter with an optional block period, evaluated atomically in Redis so the
 * limit holds across instances and restarts (the default throttler storage is per-process memory).
 *
 * KEYS[1] = hit counter, KEYS[2] = block marker
 * ARGV[1] = window ttl (ms), ARGV[2] = limit, ARGV[3] = block duration (ms)
 * Returns { totalHits, windowTtlMs, isBlocked (0/1), blockTtlMs }
 */
const INCREMENT_SCRIPT = `
local blockTtl = redis.call('PTTL', KEYS[2])
if blockTtl > 0 then
  local blockedHits = tonumber(redis.call('GET', KEYS[1]) or '0')
  local blockedTtl = redis.call('PTTL', KEYS[1])
  return { blockedHits, blockedTtl, 1, blockTtl }
end

local hits = redis.call('INCR', KEYS[1])
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end

if hits > tonumber(ARGV[2]) then
  redis.call('SET', KEYS[2], '1', 'PX', ARGV[3])
  return { hits, ttl, 1, tonumber(ARGV[3]) }
end

return { hits, ttl, 0, 0 }
`

export class ThrottlerRedisStorage implements ThrottlerStorage {
  private readonly logger = new Logger(ThrottlerRedisStorage.name)

  constructor(private readonly store: RedisStoreService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const windowMs = Math.max(1, Math.ceil(ttl))
    const blockMs = Math.max(1, Math.ceil(blockDuration || ttl))
    const base = `throttle:${throttlerName}:${key}`

    try {
      const [totalHits, windowTtlMs, blocked, blockTtlMs] = await this.store.evalScript<number[]>(
        INCREMENT_SCRIPT,
        [`${base}:hits`, `${base}:block`],
        [windowMs, limit, blockMs],
      )

      // The throttler guard expects seconds (used for Retry-After / X-RateLimit-Reset headers)
      return {
        totalHits: Number(totalHits),
        timeToExpire: Math.max(0, Math.ceil(Number(windowTtlMs) / 1000)),
        isBlocked: Number(blocked) === 1,
        timeToBlockExpire: Math.max(0, Math.ceil(Number(blockTtlMs) / 1000)),
      }
    } catch (err: unknown) {
      // Fail open: a Redis outage must not take the whole API down; it is logged loudly instead
      this.logger.error(`Rate limit check failed, allowing request: ${(err as Error)?.message}`)
      return { totalHits: 0, timeToExpire: 0, isBlocked: false, timeToBlockExpire: 0 }
    }
  }
}
