import { AsyncLocalStorage } from 'node:async_hooks'
import { EnumWorkerBatchMode } from '../enums'
import {
  IWorkerCallbackOptions,
  IWorkerHandler,
  IWorkerJobBatchInfo,
  IWorkerJobContext,
  IWorkerJobResult,
} from '../interfaces'

/**
 * Base class for queue job handlers: runs `handle` inside a per-job context so handlers can
 * collect metadata (persisted with the job), and provides no-op completion callbacks.
 */
export abstract class WorkerHandlerBase<T = any> implements IWorkerHandler<T> {
  abstract topic: string
  abstract version: number
  timeoutMs?: number

  // One instance serves concurrent jobs: keep per-job state out of instance fields
  private readonly jobContext = new AsyncLocalStorage<IWorkerJobContext>()

  abstract handle(version: number, message: T, signal?: AbortSignal): Promise<IWorkerJobResult>

  execute(version: number, message: T, context: IWorkerJobContext): Promise<IWorkerJobResult> {
    return this.jobContext.run(context, () => this.handle(version, message, context.signal))
  }

  async onSuccess(_result: unknown, _options: IWorkerCallbackOptions<T>): Promise<boolean> {
    return true
  }

  async onFailure(_error: Error, _options: IWorkerCallbackOptions<T>): Promise<boolean> {
    return true
  }

  protected ok<R>(data?: R | null): IWorkerJobResult<R> {
    return { success: true, data: data ?? null }
  }

  protected fail<R>(message: string, data?: R | null, retryable = false): IWorkerJobResult<R> {
    return { success: false, message, data: data ?? null, retryable }
  }

  /**
   * Split this job into one child job per payload. The job waits (WAITING) until every child
   * is finalized, then its onSuccess (all succeeded) or onFailure (any failed) runs. Children
   * run on `options.topic` (default: this handler; tell them apart with `getBatch()`). An
   * empty list completes the job right away.
   */
  protected batches<P, R>(
    payloads: P[],
    options: { mode: EnumWorkerBatchMode; topic?: string; version?: number; data?: R | null },
  ): IWorkerJobResult<R> {
    const { data, ...batches } = options
    return { success: true, data: data ?? null, batches: { ...batches, payloads } }
  }

  /**
   * The parent id and batch number when the current job is a batch of a parent job
   */
  protected getBatch(): IWorkerJobBatchInfo | null {
    return this.jobContext.getStore()?.batch ?? null
  }

  protected getMetadata(): Record<string, unknown> | null {
    return this.jobContext.getStore()?.metadata ?? null
  }

  protected addMetadata(metadata: Record<string, unknown>): Record<string, unknown> | null {
    const context = this.jobContext.getStore()
    if (!context) return null

    context.metadata = { ...(context.metadata ?? {}), ...metadata }

    return context.metadata
  }
}
