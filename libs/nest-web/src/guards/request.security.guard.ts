import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
  PreconditionFailedException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  EnumRouteType,
  HelperService,
  IRequestApp,
  IResponseApp,
  RedisStoreService,
  ScopeContext,
} from 'lib/nest-core'

// Bounds keep attacker-controlled header values from bloating Redis keys
const NONCE_PATTERN = /^[A-Za-z0-9_-]{8,128}$/
// Unix epoch in milliseconds (compared with Date.now())
const TIMESTAMP_PATTERN = /^\d{13}$/

/**
 * What the client must send, returned on every guarded response (success or error) in the
 * `x-security-mode` header, with the server clock in `x-server-time` (epoch ms) so a client
 * can correct its clock offset before building `x-timestamp`
 */
export enum EnumRequestSecurityMode {
  NONE = 'none', // security disabled: no extra headers
  NONCE = 'nonce', // x-nonce + x-timestamp
  SIGNATURE = 'signature', // x-nonce + x-timestamp + x-body-hash + x-signature
}

export const REQUEST_SECURITY_MODE_HEADER = 'x-security-mode'
export const REQUEST_SERVER_TIME_HEADER = 'x-server-time'

/**
 * Request freshness and signature check, enabled with `request.security.enable`.
 *
 * Every route: `x-nonce` (8-128 chars of [A-Za-z0-9_-]) and `x-timestamp` (epoch ms, within
 * `request.security.ttl` of the server clock). A nonce is accepted once per TTL window.
 *
 * APP routes, every method: also `x-body-hash` and `x-signature`, where
 *   x-body-hash = hex(sha256(raw request body, UTF-8))   // sha256 of "" when there is no body
 *   x-signature = hex(hmac_sha256(key, METHOD + "\n" + PATH + "\n" + NONCE + "\n"
 *                                      + TIMESTAMP + "\n" + BODY_HASH))
 * METHOD is upper case and PATH is the request target as sent, query string included
 * (`/api/v1/app/orders?page=2`). Only text bodies are covered (JSON, urlencoded, text/*):
 * multipart is not readable here (Multer parses it after the guards) and binary
 * (application/octet-stream) does not survive as a UTF-8 string, so both hash as empty.
 *
 * Every guarded response carries `x-security-mode` (EnumRequestSecurityMode) and `x-server-time`,
 * so a client learns what to send from any response, including a 412 it got by not sending it.
 *
 * Checks run cheapest first and the nonce is stored last, so a rejected request writes nothing
 * to Redis.
 */
@Injectable()
export class RequestSecurityGuard implements CanActivate {
  private readonly logger = new Logger(RequestSecurityGuard.name)
  private readonly securityEnable: boolean
  private readonly securityKey: string
  private readonly securityTTL: number

  constructor(
    private readonly store: RedisStoreService,
    private readonly config: ConfigService,
    private readonly helperService: HelperService,
  ) {
    this.securityEnable = this.config.get<boolean>('request.security.enable')
    this.securityKey = this.config.get<string>('request.security.key')
    this.securityTTL = this.config.get<number>('request.security.ttl')
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp()
    const signed = this.securityEnable && ScopeContext.isReqRoute(EnumRouteType.APP)

    // Set before any check: headers already on the response survive the exception filter
    const res = http.getResponse<IResponseApp>()
    res.setHeader(REQUEST_SECURITY_MODE_HEADER, this.mode(signed))
    res.setHeader(REQUEST_SERVER_TIME_HEADER, String(Date.now()))

    if (!this.securityEnable) {
      return true
    }

    const req = http.getRequest<IRequestApp>()
    const nonce = req.headers['x-nonce'] as string
    const timestamp = req.headers['x-timestamp'] as string

    if (!nonce || !timestamp) {
      this.reject('http.clientError.missingSecurityHeaders')
    }

    // A non-numeric timestamp would make the window check below compare NaN (always false)
    // and skip it, so only a plain epoch-ms integer is accepted
    const reqTs = TIMESTAMP_PATTERN.test(timestamp) ? Number(timestamp) : NaN
    if (
      !Number.isSafeInteger(reqTs) ||
      !NONCE_PATTERN.test(nonce) ||
      Math.abs(Date.now() - reqTs) > this.securityTTL
    ) {
      this.reject('http.clientError.nonceTimeout')
    }

    if (signed) {
      this.verifySignature(req, nonce, timestamp)
    }

    if (!(await this.claimNonce(nonce))) {
      this.reject('http.clientError.nonceTimeout')
    }

    return true
  }

  private verifySignature(req: IRequestApp, nonce: string, timestamp: string): void {
    const signature = req.headers['x-signature'] as string
    const bodyHash = req.headers['x-body-hash'] as string

    if (!signature || !bodyHash) {
      this.reject('http.clientError.missingSignatureHeaders')
    }

    const serverBodyHash = this.helperService.hashCreate(this.rawBody(req), {
      algorithm: 'sha256',
    })
    if (bodyHash.toLowerCase() !== serverBodyHash) {
      this.reject('http.clientError.invalidBodyHash')
    }

    // Binding method and path stops a signed body from being sent to another endpoint
    const payload = [req.method.toUpperCase(), req.originalUrl, nonce, timestamp, serverBodyHash]
    const validated = this.helperService.hmacCompare(payload.join('\n'), signature.toLowerCase(), {
      algorithm: 'sha256',
      key: this.securityKey,
    })

    if (!validated) {
      this.reject('http.clientError.invalidSignature')
    }
  }

  /**
   * The text body the client sent, kept as bytes by the body parser for JSON / urlencoded /
   * text (all UTF-8, so decoding then re-encoding keeps the client's bytes and hash); empty
   * otherwise (no body, multipart, application/octet-stream)
   */
  private rawBody(req: IRequestApp): string {
    return Buffer.isBuffer(req.rawBody) ? req.rawBody.toString('utf8') : ''
  }

  /**
   * Atomic SET NX: of two concurrent requests with the same nonce, exactly one wins. Keyed by
   * the nonce alone (not the client IP), so a captured request cannot be replayed from another
   * address; the TTL covers the whole timestamp window, so a nonce cannot be reused while its
   * timestamp is still accepted.
   */
  private async claimNonce(nonce: string): Promise<boolean> {
    try {
      return await this.store.setIfAbsent(`security:nonce:${nonce}`, this.securityTTL)
    } catch (err: unknown) {
      // Fail closed: without the nonce store, replay protection cannot be guaranteed
      this.logger.error(`Nonce store unavailable: ${(err as Error)?.message}`)
      throw new ServiceUnavailableException({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'http.serverError.serviceUnavailable',
      })
    }
  }

  private mode(signed: boolean): EnumRequestSecurityMode {
    if (!this.securityEnable) return EnumRequestSecurityMode.NONE
    return signed ? EnumRequestSecurityMode.SIGNATURE : EnumRequestSecurityMode.NONCE
  }

  private reject(message: string): never {
    throw new PreconditionFailedException({ statusCode: HttpStatus.PRECONDITION_FAILED, message })
  }
}
