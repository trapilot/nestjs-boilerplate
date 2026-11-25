import { EnumWorkerBatchMode } from '../enums'

interface IWorkerPublishBase<T> {
  version: number
  priority: number
  exclusive?: boolean
  persistent?: boolean // remove when completed
  attempts?: number // retry
  threshold?: number
  message?: T
  /**
   * Dedupe key (implies `exclusive`): a job is skipped while another one with the same
   * topic + key is still queued. Without it, exclusive jobs dedupe on topic + version + message.
   */
  dedupeKey?: string
}

type IWorkerPublishDelayOption = {
  delayMs: number
  startDate?: never
}

type IWorkerPublishStartDateOption = {
  startDate: Date
  delayMs?: never
}

export interface IWorkerCursor {
  lastId: number
  batchId: number
  [key: string]: unknown
}

export interface IWorkerConfig {
  concurrency: number // handlers running at the same time on this node
  maxRunningJobs?: number // jobs locked by this node (running + waiting); never below concurrency
  pollIntervalMs: number
  maintainIntervalMs?: number // retry onSuccess/onFailure callbacks of stale SUCCESS/FAILED jobs
  recoveryIntervalMs?: number // hand RUNNING jobs with a stale heartbeat back to PENDING
  heartbeatIntervalMs?: number // stale after 3 × this interval
  shutdownTimeoutMs?: number // max time to drain running jobs on shutdown (default 25s)
  jobTimeoutMs?: number // default max run time of one attempt (default 5 min); handler.timeoutMs wins
}

export type IWorkerPublishOptions<T = unknown> =
  | (IWorkerPublishBase<T> & IWorkerPublishDelayOption)
  | (IWorkerPublishBase<T> & IWorkerPublishStartDateOption)

export type IWorkerRepublishOptions<T> = Omit<
  IWorkerPublishOptions<T>,
  'exclusive' | 'dedupeKey' | 'startDate'
>

export interface IWorkerProducer {
  publish<T>(topic: string, options?: IWorkerPublishOptions<T>): Promise<void>
  republish<T>(topic: string, options?: IWorkerRepublishOptions<T>): Promise<void>
}

export interface IWorkerConsumer {
  register<T>(handler: IWorkerHandler<T>): void
  start(): Promise<void>
  stop(): Promise<void>
}

export interface IWorkerScanner {
  scan<T>(name: string, version: number): Promise<T>
  scans<T>(name: string): Promise<T[]>
  reset(name: string, version: number): Promise<void>
  commit(
    name: string,
    options: {
      version: number
      batchId: number | null
      lastId: number | null
    },
  ): Promise<number | null>
  runWithCursor<T>({
    topic,
    version,
    chunking,
    context,
    retrieve,
    process,
    beforeReset,
    shouldRepublish,
  }: {
    topic: string
    version: number
    chunking?: number
    context?: { message: object; childKey: string | number }
    retrieve: (state: IWorkerCursor) => Promise<T[]>
    process: (items: T[]) => Promise<number | null>
    beforeReset?: (state: IWorkerCursor) => Promise<void>
    shouldRepublish?: (items: T[], state: IWorkerCursor) => Promise<boolean>
  }): Promise<void>
}

export interface IWorkerJobBatches<P = unknown> {
  mode: EnumWorkerBatchMode
  payloads: P[] // one child job per payload, run in this order in SEQUENTIAL mode
  topic?: string // handler of the child jobs (default: the parent's topic)
  version?: number // default: the parent's version
}

export interface IWorkerJobResult<T = unknown> {
  success: boolean
  data?: T | null // persisted as the job result (archive on success, failure record otherwise)
  message?: string // failure reason when success = false (becomes lastError)
  retryable?: boolean // only for success = false; default false
  // only with success = true: split the job into child jobs; it is done once all of them are
  batches?: IWorkerJobBatches
}

export interface IWorkerJobBatchInfo {
  parentId: number
  batchNo: number // 1-based
}

export interface IWorkerJobContext {
  metadata: Record<string, unknown> | null
  signal?: AbortSignal
  batch?: IWorkerJobBatchInfo | null // set when the job is a batch of a parent job
}

export interface IWorkerCallbackOptions<T = Record<string, any>> {
  version: number
  payload: T
  executeAt: Date // when the job was locked for its last attempt
  metadata?: Record<string, any> | null
  batch?: IWorkerJobBatchInfo | null // set when the job is a batch of a parent job
  // set on a parent job: how its batches ended (callbacks run once all of them are finalized)
  batches?: { mode: EnumWorkerBatchMode; total: number; done: number; failed: number } | null
}

export interface IWorkerHandler<T = any> {
  topic: string
  version: number
  timeoutMs?: number // max run time of one attempt; falls back to IWorkerConfig.jobTimeoutMs
  handle(version: number, message: T, signal?: AbortSignal): Promise<IWorkerJobResult>
  /**
   * Run `handle` within a per-job context; metadata collected during the run is written
   * to `context.metadata`
   */
  execute(version: number, message: T, context: IWorkerJobContext): Promise<IWorkerJobResult>
  /**
   * Called once the job is SUCCESS / FAILED. Return false (or throw) to have the maintain
   * loop call it again later; the job is archived / recorded only after it returns true.
   */
  onSuccess(result: unknown, options: IWorkerCallbackOptions<T>): Promise<boolean>
  onFailure(error: Error, options: IWorkerCallbackOptions<T>): Promise<boolean>
}

export interface IWorkerEventEnvelope<T> {
  topic: string
  version: number
  payload: T
  metadata?: {
    correlationId?: string
    causationId?: string
    userId?: string
    traceId?: string
    tenantId?: string
  }
}
