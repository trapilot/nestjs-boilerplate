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
  RedisStoreService,
  ScopeContext,
} from 'lib/nest-core'

// Bounds keep attacker-controlled header values from bloating Redis keys
const NONCE_PATTERN = /^[A-Za-z0-9_-]{8,128}$/

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
    if (!this.securityEnable) {
      return true
    }

    const req = context.switchToHttp().getRequest<IRequestApp>()

    const method = req.method.toUpperCase()
    const nonce = req.headers['x-nonce'] as string
    const timestamp = req.headers['x-timestamp'] as string

    if (!nonce || !timestamp) {
      throw new PreconditionFailedException({
        statusCode: HttpStatus.PRECONDITION_FAILED,
        message: 'http.clientError.missingSecurityHeaders',
      })
    }

    // Number('abc') is NaN, and NaN comparisons are always false, which would skip the
    // freshness check entirely, so reject anything that is not a plain integer timestamp
    const reqTs = /^\d{10,16}$/.test(timestamp) ? Number(timestamp) : NaN
    if (!Number.isSafeInteger(reqTs) || !NONCE_PATTERN.test(nonce)) {
      throw new PreconditionFailedException({
        statusCode: HttpStatus.PRECONDITION_FAILED,
        message: 'http.clientError.nonceTimeout',
      })
    }

    const isNonceValid = await this.checkAndSaveNonce(nonce, reqTs, req.ip)

    if (!isNonceValid) {
      throw new PreconditionFailedException({
        statusCode: HttpStatus.PRECONDITION_FAILED,
        message: 'http.clientError.nonceTimeout',
      })
    }

    // --- Only validate signature/body for "safe" methods ---
    const skipSignatureCheck = ['GET', 'DELETE', 'HEAD', 'OPTIONS'].includes(method)
    if (!skipSignatureCheck && ScopeContext.isReqRoute(EnumRouteType.APP)) {
      const signature = req.headers['x-signature'] as string
      const bodyHash = req.headers['x-body-hash'] as string

      if (!signature || !bodyHash) {
        throw new PreconditionFailedException({
          statusCode: HttpStatus.PRECONDITION_FAILED,
          message: 'http.clientError.missingSignatureHeaders',
        })
      }

      const bodyPayload = req.body ? JSON.stringify(req.body) : ''
      const validated = this.checkSignature(bodyPayload, bodyHash, {
        nonce,
        timestamp: reqTs,
        signature,
      })

      if (!validated) {
        throw new PreconditionFailedException({
          statusCode: HttpStatus.PRECONDITION_FAILED,
          message: 'http.clientError.invalidSignature',
        })
      }
    }
    return true
  }

  private async checkAndSaveNonce(nonce: string, reqTs: number, reqIp: string): Promise<boolean> {
    // Reject timestamps outside the accepted window (too old or too far in the future)
    if (Math.abs(Date.now() - reqTs) > this.securityTTL) {
      return false
    }

    try {
      // Atomic SET NX: of two concurrent requests with the same nonce, exactly one wins.
      // TTL covers the whole window so a nonce can never be replayed while its timestamp is valid.
      return await this.store.setIfAbsent(`security:nonce:${reqIp}:${nonce}`, this.securityTTL)
    } catch (err: unknown) {
      // Fail closed: without the nonce store, replay protection cannot be guaranteed
      this.logger.error(`Nonce store unavailable: ${(err as Error)?.message}`)
      throw new ServiceUnavailableException({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'http.serverError.serviceUnavailable',
      })
    }
  }

  private checkSignature(
    bodyPayload: string,
    bodyHash: string,
    checkOpts: {
      nonce: string
      timestamp: number
      signature: string
    },
  ): boolean {
    // Hash body of request on server
    const serverBodyHash = this.helperService.hashCreate(bodyPayload, {
      algorithm: 'sha256',
    })

    // Compare the body hash with the hash from the client
    if (serverBodyHash !== bodyHash) {
      throw new PreconditionFailedException({
        statusCode: HttpStatus.PRECONDITION_FAILED,
        message: 'http.clientError.invalidBodyHash',
      })
    }

    // Create dataToValidate with only metadata and hash of body
    const dataToValidate = `${checkOpts.nonce}${checkOpts.timestamp}${bodyHash}`
    const validated = this.helperService.hmacCompare(dataToValidate, checkOpts.signature, {
      algorithm: 'sha256',
      key: this.securityKey,
    })

    return validated
  }
}
