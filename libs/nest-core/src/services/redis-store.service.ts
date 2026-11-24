import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, RedisClientType } from '@keyv/redis'

const CONNECT_TIMEOUT_MS = 10_000

/**
 * Shared Redis/Valkey client for state that must be consistent across instances and needs
 * atomic operations the Keyv cache cannot express (SET NX, scripted counters).
 * Used by the request nonce guard and the rate limiter storage.
 */
@Injectable()
export class RedisStoreService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisStoreService.name)
  private readonly client: RedisClientType
  private readonly prefix: string

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('redis.store.url')
    if (!url) {
      throw new Error('redis.store.url is not configured (set STORE_REDIS_URL or CACHE_REDIS_URL)')
    }

    this.prefix = `${this.config.get<string>('redis.store.namespace', 'Store')}:`
    this.client = createClient({ url }) as RedisClientType
    this.client.on('error', (err: Error) => this.logger.error(`Redis store error: ${err.message}`))
  }

  async onModuleInit(): Promise<void> {
    // Fail fast at boot: nonce replay protection and rate limiting are not optional.
    // node-redis retries the first connection forever, so bound it with a timeout.
    let timer: NodeJS.Timeout | undefined
    try {
      await Promise.race([
        this.client.connect().then(() => this.client.ping()),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`Redis store not reachable within ${CONNECT_TIMEOUT_MS}ms`)),
            CONNECT_TIMEOUT_MS,
          )
        }),
      ])
    } catch (err: unknown) {
      this.client.destroy()
      throw err
    } finally {
      clearTimeout(timer)
    }
    this.logger.log('Connected to Redis store')
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit()
    }
  }

  key(name: string): string {
    return `${this.prefix}${name}`
  }

  /**
   * Atomically stores the key only if it does not exist yet.
   * Returns true when this call created it, false when it already existed.
   */
  async setIfAbsent(name: string, ttlMs: number, value: string = '1'): Promise<boolean> {
    const result = await this.client.set(this.key(name), value, {
      condition: 'NX',
      expiration: { type: 'PX', value: Math.max(1, Math.ceil(ttlMs)) },
    })
    return result === 'OK'
  }

  async evalScript<T>(script: string, keys: string[], args: Array<string | number>): Promise<T> {
    return (await this.client.eval(script, {
      keys: keys.map(k => this.key(k)),
      arguments: args.map(String),
    })) as T
  }
}
