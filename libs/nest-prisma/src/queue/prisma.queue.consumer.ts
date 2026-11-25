import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { EnumJobStatus, Prisma, QueueJob } from '@runtime/prisma-client'
import { randomUUID } from 'crypto'
import { hostname } from 'os'
import {
  AppUtil,
  EnumScopeType,
  EnumWorkerBatchMode,
  HelperService,
  IWorkerCallbackOptions,
  IWorkerConfig,
  IWorkerHandler,
  IWorkerJobBatchInfo,
  IWorkerJobContext,
  IWorkerJobResult,
  LoggerService,
  RunnerService,
  ScopeContext,
  WORKER_CONFIG,
  WORKER_LOG_CONTEXT,
  WorkerConsumer,
  WorkerResultException,
  WorkerTimeoutException,
} from 'lib/nest-core'
import { PrismaService } from '../services'
import { PrismaQueueStore } from './prisma.queue.store'

const DEFAULT_CONFIG: Required<IWorkerConfig> = {
  concurrency: 5, // ≤ half the DB pool, so API requests always get a connection
  maxRunningJobs: 5, // locked per node (running + waiting); keep equal to concurrency
  pollIntervalMs: 5000, // a job waits at most ~5s before it starts
  maintainIntervalMs: 30_000, // retry onSuccess/onFailure callbacks that did not complete
  recoveryIntervalMs: 60_000, // hand back jobs of a dead worker
  heartbeatIntervalMs: 10_000, // a job is stale after 3 missed beats = 30s
  shutdownTimeoutMs: 25_000, // platform grace period must be longer
  jobTimeoutMs: 5 * 60_000, // per attempt; a handler's timeoutMs overrides it
}

const toJson = (value: unknown) =>
  value === undefined || value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue)

const errorMessage = (err: unknown) => AppUtil.catchMessage(err)

/**
 * DB-backed queue worker.
 *
 * Job lifecycle: PENDING → (claim) RUNNING → SUCCESS | FAILED → (onSuccess / onFailure
 * callback returns true) archived / recorded and removed. A failed attempt that may be
 * retried goes back to PENDING with a backoff. Jobs whose worker died (stale heartbeat) are
 * recovered to PENDING; SUCCESS/FAILED jobs whose callback did not complete are finalized
 * again by the maintain loop.
 */
@Injectable()
export class PrismaWorkerConsumer extends WorkerConsumer implements OnModuleInit, OnModuleDestroy {
  // Worker logs go to logs/worker (context-routed by the file logger), not the system log
  private readonly log = {
    info: (message: string) => this.logger.log(message, WORKER_LOG_CONTEXT),
    warn: (message: string) => this.logger.warn(message, WORKER_LOG_CONTEXT),
    error: (message: string) => this.logger.error(message, WORKER_LOG_CONTEXT),
  }
  private readonly cfg: Required<IWorkerConfig>
  private readonly heartbeatTimeoutMs: number // stale after 3 missed heartbeats
  // Unique per process start: pid alone collides across containers (often pid 1) and restarts
  private readonly workerId = `worker-${hostname()}-${process.pid}-${randomUUID().slice(0, 8)}`
  private readonly workerQueue = 'queue:consumer-polling'
  private store!: PrismaQueueStore
  private handlers = new Map<string, IWorkerHandler>()

  // Jobs locked by this worker and not settled yet: all of them get heartbeats so other nodes
  // do not recover them. runningJobIds is the subset whose handler has started.
  private lockedJobIds = new Set<number>()
  private runningJobIds = new Set<number>()

  private isPolling = false
  private loopTimers: NodeJS.Timeout[] = [] // recovery + maintain, stopped first on shutdown
  private heartbeatTimer?: NodeJS.Timeout // kept until running jobs are drained
  private pollingPromise?: Promise<void>
  private stoppingPromise?: Promise<void>
  private wakePollingLoop?: () => void

  constructor(
    private readonly ref: ModuleRef,
    private readonly logger: LoggerService,
    private readonly runner: RunnerService,
    private readonly helperService: HelperService,
    @Inject(WORKER_CONFIG) config: IWorkerConfig,
  ) {
    super()

    // `||`, not `??`: a 0 or missing value falls back to the default
    this.cfg = Object.fromEntries(
      Object.entries(DEFAULT_CONFIG).map(([key, value]) => [key, config?.[key] || value]),
    ) as Required<IWorkerConfig>
    this.cfg.maxRunningJobs = Math.max(this.cfg.maxRunningJobs, this.cfg.concurrency)
    this.heartbeatTimeoutMs = this.cfg.heartbeatIntervalMs * 3
  }

  onModuleInit() {
    this.store = new PrismaQueueStore(this.ref.get(PrismaService, { strict: false }))
  }

  // RunnerService may be destroyed before NestWebModule calls stop(): stop here as well
  async onModuleDestroy() {
    await this.stop()
  }

  register(handler: IWorkerHandler): void {
    this.handlers.set(handler.topic, handler)
  }

  async start(): Promise<void> {
    if (this.isPolling) return

    this.isPolling = true

    // Loops, timers and jobs started inside this scope inherit it (AsyncLocalStorage): their logs
    // go to logs/worker and their SQL is not logged. Handlers' @OnScope reuses this scope.
    await this.inWorkerScope(() => this.startLoops())
  }

  private inWorkerScope<T>(fn: () => Promise<T>): Promise<T> {
    return ScopeContext.create(
      { scopeType: EnumScopeType.QUEUE, logger: { context: WORKER_LOG_CONTEXT, query: false } },
      fn,
    ) as Promise<T>
  }

  private async startLoops(): Promise<void> {
    this.log.info(`Worker started: ${this.workerId}`)

    // Pick up jobs left by a previous process right away instead of waiting for the first tick
    await this.guard('Recovery', () => this.recoverOrphanJobs())

    const jitter = () => Math.floor(Math.random() * 10_000) // spread nodes apart
    this.loopTimers = [
      this.every('Recovery', this.cfg.recoveryIntervalMs + jitter(), () =>
        this.recoverOrphanJobs(),
      ),
      this.every('Maintain', this.cfg.maintainIntervalMs + jitter(), () =>
        this.retryFinalizedJob(),
      ),
    ]
    this.heartbeatTimer = this.every('Heartbeat', this.cfg.heartbeatIntervalMs, () =>
      this.store.touchHeartbeat([...this.lockedJobIds], this.workerId),
    )

    this.pollingPromise = this.pollingLoop()
  }

  async stop(): Promise<void> {
    if (!this.isPolling) return this.stoppingPromise

    // Stop polling first so no new jobs are picked up while draining
    this.isPolling = false
    this.log.info(`Stopping worker: ${this.workerId}`)

    this.stoppingPromise = this.inWorkerScope(async () => {
      this.loopTimers.forEach(clearInterval)
      this.loopTimers = []

      this.wakePollingLoop?.()
      await this.pollingPromise

      // Drop jobs still waiting in the local queue and hand them back to the cluster right
      // away, then wait only for the ones already running. Heartbeats keep going meanwhile
      // so other nodes do not take over (and re-run) jobs still in progress here.
      this.runner.clear(this.workerQueue)
      await this.guard('Release unstarted jobs', () => this.releaseUnstartedJobs())
      await this.guard(`Drain [${[...this.runningJobIds].join(', ')}]`, () =>
        this.runner.waitForIdle(this.workerQueue, this.cfg.shutdownTimeoutMs),
      )

      clearInterval(this.heartbeatTimer)
      this.log.info(`Worker stopped: ${this.workerId}`)
    })

    return this.stoppingPromise
  }

  // =========================
  // Loops
  // =========================

  /**
   * Run `task` every `intervalMs`, skipping a tick while the previous run is still in progress.
   * Errors are logged: a DB hiccup must never become an unhandled rejection.
   */
  private every(name: string, intervalMs: number, task: () => Promise<unknown>): NodeJS.Timeout {
    let busy = false

    return setInterval(async () => {
      if (busy) return

      busy = true
      await this.guard(name, task)
      busy = false
    }, intervalMs)
  }

  private async guard(name: string, task: () => Promise<unknown>): Promise<void> {
    try {
      await task()
    } catch (err: unknown) {
      this.log.error(`${name} failed: ${errorMessage(err)}`)
    }
  }

  private async pollingLoop() {
    while (this.isPolling) {
      const start = Date.now()

      await this.guard('Polling', () => this.pollAndRunJobs())

      // stop() may have been called while polling (no sleep to wake yet)
      if (!this.isPolling) break

      // Sleep, cut short by stop() so shutdown does not wait a full poll interval
      await new Promise<void>(resolve => {
        const timer = setTimeout(
          resolve,
          Math.max(100, this.cfg.pollIntervalMs - (Date.now() - start)),
        )
        this.wakePollingLoop = () => {
          clearTimeout(timer)
          resolve()
        }
      })
      this.wakePollingLoop = undefined
    }
  }

  private async pollAndRunJobs() {
    // Only claim what this node can take: locked-but-waiting jobs would otherwise pile up
    // locally while idle nodes could run them
    const capacity = this.cfg.maxRunningJobs - this.lockedJobIds.size
    if (capacity <= 0) return

    const limit = Math.min(capacity, this.cfg.concurrency)
    const jobIds = await this.store.claimPendingBatch(this.workerId, limit)

    for (const jobId of jobIds) {
      // Heartbeat from lock time, not only once the handler starts
      this.lockedJobIds.add(jobId)

      this.runner
        .run(this.workerQueue, () => this.processJob(jobId), { concurrency: this.cfg.concurrency })
        .catch((err: unknown) => {
          this.lockedJobIds.delete(jobId)
          this.log.error(`Job ${jobId} failed to settle: ${errorMessage(err)}`)
        })
    }
  }

  /**
   * Hand RUNNING jobs with a stale (or missing) heartbeat back to PENDING. Covers jobs of any
   * dead worker, including this node's previous process after a restart (workerId changes).
   */
  private async recoverOrphanJobs() {
    const tracked = [...this.lockedJobIds]
    const count = await this.store.recoverStale(this.workerId, tracked, this.heartbeatTimeoutMs)

    if (count > 0) this.log.warn(`Recovered ${count} stale jobs`)
  }

  /**
   * Release jobs locked by this worker whose handler has not started yet. On failure they stay
   * locked and recovery hands them back once their heartbeat goes stale.
   */
  private async releaseUnstartedJobs() {
    const jobIds = [...this.lockedJobIds].filter(id => !this.runningJobIds.has(id))
    if (!jobIds.length) return

    const count = await this.store.releaseLocked(jobIds, this.workerId)
    jobIds.forEach(id => this.lockedJobIds.delete(id))

    this.log.info(`Released ${count} unstarted jobs`)
  }

  /**
   * Finalize one SUCCESS/FAILED job whose callback did not complete (callback returned false,
   * threw, or its worker died)
   */
  private async retryFinalizedJob() {
    const job = await this.store.claimStaleFinalized(this.workerId, this.heartbeatTimeoutMs)
    if (!job) return

    this.lockedJobIds.add(job.id)
    try {
      await this.finalizeJob(job)
    } finally {
      this.lockedJobIds.delete(job.id)
    }
  }

  // =========================
  // Job execution
  // =========================

  /**
   * Process a single job: handler errors go to failJob (retry / fail); once the handler
   * succeeded the job only moves forward via completeJob. Never throws.
   */
  private async processJob(jobId: number) {
    const context: IWorkerJobContext = { metadata: null }
    this.runningJobIds.add(jobId)

    try {
      const job = await this.store.findOwned(jobId, this.workerId)
      if (!job) {
        this.log.warn(`Job ${jobId} not found or lock lost`)
        return
      }

      context.batch = this.batchInfo(job)

      let result: IWorkerJobResult
      try {
        result = await this.runHandler(job, context)
      } catch (err: unknown) {
        await this.failJob(job, err, context.metadata)
        return
      }

      // Handler succeeded: errors from here on must not lead to failJob, otherwise the job is
      // retried and its side effect runs twice
      await this.completeJob(job, result, context.metadata)
    } catch (err: unknown) {
      this.log.error(`Job ${jobId} failed: ${errorMessage(err)}`)
    } finally {
      this.runningJobIds.delete(jobId)
      this.lockedJobIds.delete(jobId)
    }
  }

  /**
   * Run the job's handler bounded by its timeout (handler.timeoutMs or jobTimeoutMs). On
   * timeout, context.signal is aborted and this rejects with WorkerTimeoutException; a handler
   * ignoring the signal keeps running but its late result is dropped. Resolves with the
   * successful result; an unsuccessful one rejects with WorkerResultException.
   */
  private async runHandler(job: QueueJob, context: IWorkerJobContext): Promise<IWorkerJobResult> {
    const handler = this.handlers.get(job.jobName)
    if (!handler) throw new Error(`No QueueHandler registered for topic: ${job.jobName}`)

    const timeoutMs = handler.timeoutMs ?? this.cfg.jobTimeoutMs
    const controller = new AbortController()
    context.signal = controller.signal

    let timer: NodeJS.Timeout | undefined
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort()
        reject(new WorkerTimeoutException(`Job exceeded run timeout ${timeoutMs}ms`))
      }, timeoutMs)
    })

    try {
      const running = handler.execute(job.version, job.payload, context)
      running.catch(() => undefined) // the handler may reject after the deadline passed

      const outcome: IWorkerJobResult = await Promise.race([running, deadline])

      if (typeof outcome?.success !== 'boolean') {
        throw new Error(`Handler ${job.jobName} must return IWorkerJobResult`)
      }
      if (!outcome.success) throw new WorkerResultException(outcome)

      return outcome
    } catch (err: unknown) {
      // A handler reacting to the abort rejects with its own error: report it as a timeout
      if (controller.signal.aborted && !(err instanceof WorkerTimeoutException)) {
        throw new WorkerTimeoutException(`Job exceeded run timeout: ${errorMessage(err)}`)
      }
      throw err
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Mark the job SUCCESS (with its result) and finalize it; or, when the handler split it into
   * batches, turn it into a WAITING parent with its child jobs (finalized once they all are)
   */
  private async completeJob(
    job: QueueJob,
    result: IWorkerJobResult,
    metadata: Record<string, unknown>,
  ) {
    const data: Prisma.QueueJobUpdateManyMutationInput = {
      result: toJson(result.data),
      ...(metadata && { metadata: toJson(metadata) }),
    }
    const batches = result.batches?.payloads?.length ? result.batches : null

    let owned: boolean
    try {
      owned = await this.withDbRetry(() =>
        batches
          ? this.store.splitIntoBatches(
              job,
              this.workerId,
              {
                mode: batches.mode,
                topic: batches.topic ?? job.jobName,
                version: batches.version ?? job.version,
                payloads: batches.payloads,
              },
              data,
            )
          : this.store.transition(
              job,
              this.workerId,
              EnumJobStatus.RUNNING,
              { ...data, status: EnumJobStatus.SUCCESS },
              { heartbeat: true },
            ),
      )
    } catch (err: unknown) {
      this.log.error(
        `Job ${job.id} could not record its result, it may run again: ${errorMessage(err)}`,
      )
      return
    }

    if (!owned) {
      this.log.warn(`Job ${job.id} lock lost or already transitioned, skip finalize`)
      return
    }

    if (batches) {
      this.log.info(`Job ${job.id} split into ${batches.payloads.length} ${batches.mode} batches`)
      return
    }

    // A failure here is retried by the maintain loop
    await this.guard(`Job ${job.id} finalize`, () => this.finalizeJob(job))
  }

  /**
   * Retry the job with backoff, or mark it FAILED and finalize it when it may not be retried
   * (error.retryable === false) or retries are exhausted
   */
  private async failJob(job: QueueJob, error: unknown, metadata: Record<string, unknown>) {
    const lastError = errorMessage(error)
    const retryable = (error as { retryable?: boolean } | null)?.retryable !== false
    const retry = retryable && job.retryCount + 1 < job.maxRetries

    const data: Prisma.QueueJobUpdateManyMutationInput = retry
      ? {
          status: EnumJobStatus.PENDING,
          retryCount: job.retryCount + 1,
          lockedAt: null,
          lockedBy: null,
          heartbeatAt: null,
          // Exponential backoff: 5s, 10s, 20s, ... capped at 1h
          startAt: this.helperService.dateForward(this.helperService.dateNow(), {
            second: Math.min(5 * 2 ** job.retryCount, 3600),
          }),
        }
      : { status: EnumJobStatus.FAILED, retryCount: job.retryCount + 1 }

    const owned = await this.store.transition(
      job,
      this.workerId,
      EnumJobStatus.RUNNING,
      {
        ...data,
        lastError,
        // Keep the data of an unsuccessful result next to the error
        ...(error instanceof WorkerResultException && { result: toJson(error.result.data) }),
        ...(metadata && { metadata: toJson(metadata) }),
      },
      { heartbeat: !retry },
    )

    if (!owned) {
      this.log.warn(`Job ${job.id} lock lost, skip ${retry ? 'retry' : 'finalize'}`)
      return
    }

    if (retry) {
      this.log.warn(`Job ${job.id} (${job.jobName}) retry #${job.retryCount}: ${lastError}`)
      return
    }

    this.log.error(`Job ${job.id} (${job.jobName}) failed: ${lastError}`)
    await this.finalizeJob(job)
  }

  /**
   * Run the handler's onSuccess / onFailure callback, then archive / record and remove the
   * job. When the callback does not confirm (false or throws), the job stays SUCCESS/FAILED
   * and the maintain loop retries it once its heartbeat is stale.
   */
  private async finalizeJob(job: QueueJob) {
    const handler = this.handlers.get(job.jobName)

    if (handler) {
      const succeeded = job.status === EnumJobStatus.SUCCESS
      const options: IWorkerCallbackOptions = {
        version: job.version,
        payload: job.payload as Record<string, any>,
        metadata: job.metadata as Record<string, any>,
        executeAt: job.lockedAt ?? job.startAt,
        batch: this.batchInfo(job),
        batches: job.batchMode
          ? {
              mode: job.batchMode as unknown as EnumWorkerBatchMode,
              total: job.batchTotal,
              done: job.batchDone,
              failed: job.batchFailed,
            }
          : null,
      }

      // async wrapper: a callback that throws synchronously still rejects
      const callback = (async () =>
        succeeded
          ? handler.onSuccess(job.result ?? {}, options)
          : handler.onFailure(new Error(job.lastError || 'Unknown error'), options))()

      // A throwing callback counts as not handled
      const handled = await callback.catch((err: unknown) => {
        const name = succeeded ? 'onSuccess' : 'onFailure'
        this.log.error(`Job ${job.id} ${name} failed: ${errorMessage(err)}`)
        return false
      })

      if (handled !== true) {
        // Restart the stale timer so the maintain loop retries later, not right away
        await this.store.touchHeartbeat([job.id], this.workerId)
        return
      }
    }

    const { moved, closedParent } = await this.store.moveFinalized(job, this.workerId)
    if (!moved) {
      this.log.warn(`Job ${job.id} lock lost, skip archive`)
      return
    }
    if (!closedParent) return

    // This was the last batch: the parent is now SUCCESS/FAILED and locked for this worker.
    // A failure here is retried by the maintain loop once the parent's heartbeat is stale.
    await this.guard(`Parent job ${closedParent.id} finalize`, async () => {
      const parent = await this.store.findOwned(closedParent.id, this.workerId, closedParent.status)
      if (!parent) return

      this.lockedJobIds.add(parent.id)
      try {
        await this.finalizeJob(parent)
      } finally {
        this.lockedJobIds.delete(parent.id)
      }
    })
  }

  private batchInfo(job: QueueJob): IWorkerJobBatchInfo | null {
    return job.parentId ? { parentId: job.parentId, batchNo: job.batchNo } : null
  }

  /**
   * Retry a DB write on transient errors (connection reset, deadlock, ...): 1s, 2s, 4s.
   * Only thrown errors are retried; a resolved value (e.g. lost ownership) is returned as is.
   */
  private async withDbRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await fn()
      } catch (err: unknown) {
        if (attempt >= attempts) throw err

        const delayMs = 1000 * 2 ** (attempt - 1)
        this.log.warn(
          `DB write attempt ${attempt} failed, retry in ${delayMs}ms: ${errorMessage(err)}`,
        )
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
  }
}
