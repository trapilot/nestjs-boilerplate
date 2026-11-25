import { Injectable } from '@nestjs/common'
import { EnumJobStatus, Prisma } from '@runtime/prisma-client'
import {
  HelperService,
  IWorkerPublishOptions,
  IWorkerRepublishOptions,
  RunnerService,
  WorkerProducer,
} from 'lib/nest-core'
import { PrismaService } from '../services'
import { PrismaUtil } from '../utils'
import { PrismaQueueStore } from './prisma.queue.store'

@Injectable()
export class PrismaWorkerProducer extends WorkerProducer {
  private readonly store: PrismaQueueStore

  constructor(
    prisma: PrismaService,
    private readonly runner: RunnerService,
    private readonly helperService: HelperService,
  ) {
    super()
    this.store = new PrismaQueueStore(prisma)
  }

  async publish<T>(topic: string, options: IWorkerPublishOptions<T>): Promise<void> {
    const nowDate = this.helperService.dateNow(true)
    const runDate = this.helperService.dateForward(nowDate, {
      milliseconds: Math.abs(options?.delayMs ?? 0),
    })
    const thresholdDate = this.helperService.dateForward(runDate, {
      minutes: options?.threshold ?? 30, // Failed after 30 minutes running
    })

    // A dedupe key implies exclusive: the job is skipped while one with the same hash is queued
    const exclusive = options.exclusive === true || !!options.dedupeKey
    const hashName = exclusive
      ? this.buildJobHash(
          topic,
          options.dedupeKey ??
            JSON.stringify({ version: options.version, payload: options.message }),
        )
      : null

    await this.runner.retry(
      () =>
        this.store.insert({
          jobName: topic,
          jobHash: hashName,
          version: options.version,
          priority: options.priority,
          startAt: options?.startDate ?? runDate,
          thresholdAt: thresholdDate,
          payload: options?.message as Prisma.InputJsonValue,
          retryCount: 0,
          persistent: options?.persistent,
          maxRetries: options?.attempts,
          status: EnumJobStatus.PENDING,
        }),
      {
        retries: 5,
        minDelayMs: 100,
        maxDelayMs: 2000,
        shouldRetry: err => {
          if (PrismaUtil.isDeadlockError(err)) return true
          if (PrismaUtil.isTimeoutError(err)) return true
          return false
        },
        shouldThrow: err => {
          if (PrismaUtil.isUniqueError(err)) return !exclusive
          return true
        },
      },
    )
  }

  async republish<T>(topic: string, options: IWorkerRepublishOptions<T>): Promise<void> {
    return await this.publish<T>(topic, {
      ...options,
      delayMs: options?.delayMs ?? 1000, // default delay 1s
      exclusive: false,
      dedupeKey: undefined,
    })
  }

  /**
   * Deterministic job hash (queue_jobs.jobHash is unique), scoped by topic so the same key of
   * different job types never collides
   */
  private buildJobHash(jobName: string, key: string): string {
    return this.helperService.hashCreate(`${jobName}|${key}`, { algorithm: 'sha256' })
  }
}
