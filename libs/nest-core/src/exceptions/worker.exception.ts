import { IWorkerJobResult } from '../interfaces'

/**
 * Queue job errors. `retryable = false` makes the worker fail the job right away instead of
 * retrying it; any other error (plain Error included) is retried until maxRetries.
 */
export class WorkerDataValidationException extends Error {
  readonly retryable = false
}

export class WorkerTimeoutException extends Error {
  readonly retryable = false
}

export class WorkerUnsupportedVersionException extends Error {
  readonly retryable = false

  constructor(readonly version: number) {
    super(`Unsupported job version: ${version}`)
  }
}

/**
 * Handler finished but reported success = false; carries its result so the data is
 * persisted with the failure
 */
export class WorkerResultException extends Error {
  readonly retryable: boolean

  constructor(readonly result: IWorkerJobResult) {
    super(result.message || 'JOB_RESULT_UNSUCCESSFUL')
    this.retryable = result.retryable ?? false
  }
}
