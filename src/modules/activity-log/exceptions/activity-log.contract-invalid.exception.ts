import { InternalServerErrorException } from '@nestjs/common'

/**
 * A caller broke `ActivityLogActionContract` (wrong owner fields or metadata shape).
 * This is a programming error, so it surfaces as a 500 at `prepare` time, before the write.
 */
export class ActivityLogContractInvalidException extends InternalServerErrorException {
  constructor(reason: string) {
    super({ statusCode: 500, message: 'http.serverError.internalServerError', _error: reason })
  }
}
