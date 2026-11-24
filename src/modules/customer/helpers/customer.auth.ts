import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EnumVerificationChannel, Prisma } from '@runtime/prisma-client'
import { EnumActivityLogAction } from 'modules/activity-log/enums/activity-log.enum'
import { plainToInstance } from 'class-transformer'
import {
  AuthResponseLoginDto,
  AuthResponseTokenDto,
  AuthTwoFactorUtil,
  AuthUtil,
  IAuthJwtPayload,
  IAuthLoginOptions,
  IAuthPassword,
  IAuthUserValidatorDto,
  IAuthValidator,
  IAuthValidatorOptions,
} from 'lib/nest-auth'
import {
  FileUtil,
  HelperService,
  IRequestApp,
  MailerService,
  MessageService,
  ScopeContext,
  SmsDispatcher,
} from 'lib/nest-core'
import { ActivityLogService } from 'modules/activity-log/services/activity-log.service'
import { PrismaService, PrismaUtil } from 'lib/nest-prisma'
import { CustomerChangePasswordRequestDto } from '../dtos/customer.request.change-password.dto'
import { CustomerResetPasswordRequestDto } from '../dtos/customer.request.reset-password.dto'
import { CustomerSignInRequestDto } from '../dtos/customer.request.sign-in.dto'
import { CustomerResponsePayloadDto } from '../dtos/customer.response.payload.dto'
import {
  ICustomerVerifyApproveOptions,
  ICustomerVerifyCheckOptions,
  ICustomerVerifySendEOTPOptions,
  ICustomerVerifySendPOTPOptions,
  TCustomer,
} from '../interfaces/customer.interface'
import { CustomerUtil } from './customer.util'

@Injectable()
export class CustomerAuth implements IAuthValidator<TCustomer> {
  private readonly authRelation: Prisma.CustomerInclude = {
    twoFactor: true,
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mailer: MailerService,
    private readonly message: MessageService,
    private readonly helperService: HelperService,
    private readonly smsDispatcher: SmsDispatcher,
    private readonly authUtil: AuthUtil,
    private readonly authTwoFactorUtil: AuthTwoFactorUtil,
    private readonly customerUtil: CustomerUtil,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async validatePayload(
    payload: IAuthJwtPayload,
    _request: IRequestApp,
    _options: IAuthValidatorOptions,
  ): Promise<IAuthUserValidatorDto> {
    const userData = await this.getUserData(payload.user.id)
    const userPayload = this.serializeUserData(userData)
    return { userData, userPayload }
  }

  async getUserData(userId: number): Promise<TCustomer> {
    const userData = await this.prisma.customer
      .findUniqueOrThrow({ include: this.authRelation, where: { id: userId } })
      .catch((_err: unknown) => {
        throw new ForbiddenException({
          statusCode: HttpStatus.FORBIDDEN,
          message: 'auth.error.inactive',
        })
      })
    return userData
  }

  private serializeUserData(data: TCustomer): CustomerResponsePayloadDto {
    return plainToInstance(CustomerResponsePayloadDto, data, {
      excludeExtraneousValues: true,
    })
  }

  async matchOrFail(
    where: Prisma.CustomerWhereInput,
    kwargs?: Omit<Prisma.CustomerFindFirstOrThrowArgs, 'where'>,
  ): Promise<TCustomer> {
    const customer = await this.prisma.customer
      .findFirstOrThrow({ ...kwargs, where })
      .catch((_err: unknown) => {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'auth.error.notFound',
        })
      })
    return customer
  }

  async validateCredential(dto: CustomerSignInRequestDto): Promise<TCustomer> {
    const customer = await this.matchOrFail(
      { phone: dto.phone },
      {
        include: this.authRelation,
      },
    )

    if (!customer.isEmailVerified && !customer.isPhoneVerified) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'auth.error.verified',
      })
    }

    const validate = await this.authUtil.passwordVerify(dto.password, customer.password)
    if (!validate) {
      // Recorded even though the request fails (onError)
      this.activityLogService.stagePrepared([
        this.activityLogService.prepare({
          action: EnumActivityLogAction.customerLoginFailed,
          customerId: customer.id,
          onError: true,
        }),
      ])
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'auth.error.passwordNotMatch',
      })
    }
    return customer
  }

  async validateOAuthEmail(dto: { email: string }): Promise<TCustomer> {
    const customer = await this.matchOrFail(
      { email: dto.email },
      {
        include: this.authRelation,
      },
    )
    return customer
  }

  async login(customer: TCustomer, options: IAuthLoginOptions): Promise<AuthResponseLoginDto> {
    if (!customer.isActive) {
      throw new BadRequestException({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'auth.error.inactive',
      })
    }

    if (this.authUtil.passwordCheckExpired(customer.passwordExpired)) {
      throw new BadRequestException({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'auth.error.passwordExpired',
      })
    }

    if (!customer.twoFactor?.enabled) {
      const payload = this.serializeUserData(customer)
      const session = this.authUtil.createSession(payload, options.userSession)

      const expiredAt = this.helperService.dateForward(this.helperService.dateNow(), {
        seconds: session.tokens.refreshIn,
      })

      const events = [
        this.activityLogService.prepare({
          action: CustomerUtil.getActivityLogin(options.userSession.loginType),
          customerId: customer.id,
        }),
      ]

      await Promise.all([
        this.authUtil.setLogin(options.userSession.scopeType, {
          userId: customer.id.toString(),
          userToken: session.loginToken,
          jti: session.jti,
          expiredAt,
        }),
        this.prisma.customer.update({
          where: { id: customer.id, deletedAt: null },
          data: {
            loginDate: session.loginDate,
            loginToken: session.loginToken,
            passwordExpired: expiredAt,
            sessions: {
              create: {
                jti: session.jti,
                expiredAt,
                userToken: session.loginToken,
                isRevoked: false,
                ipAddress: options.userIp,
                userAgent: PrismaUtil.toPlainObject(options.userAgent),
              },
            },
            devices: {
              create: {
                type: options.userAgent?.device?.type ?? null,
                model: options.userAgent?.device?.model ?? null,
                version: options.userAgent?.os?.version ?? null,
                createdAt: session.loginDate,
                updatedAt: session.loginDate,
                token: options.userToken,
                isActive: true,
              },
            },
          },
        }),
      ])
      this.activityLogService.stagePrepared(events)

      return {
        isTwoFactorEnable: false,
        token: session.tokens,
      }
    }

    const { challengeToken, expiresInMs } = await this.authTwoFactorUtil.createChallenge({
      userId: customer.id,
      userSession: options.userSession,
    })

    return {
      isTwoFactorEnable: true,
      twoFactor: {
        isRequiredSetup: false,
        challengeToken,
        challengeExpiresInMs: expiresInMs,
        backupCodesRemaining: PrismaUtil.toPlainArray(customer.twoFactor.backupCodes).length ?? 0,
      },
    }
  }

  async refresh(
    customer: TCustomer,
    refreshToken: string,
    _options: Omit<IAuthLoginOptions, 'userSession'>,
  ): Promise<AuthResponseTokenDto> {
    const refreshPayload = this.authUtil.payloadToken<CustomerResponsePayloadDto>(refreshToken)

    if (!refreshPayload.loginRotate) {
      throw new ForbiddenException({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'auth.error.refreshTokenUnauthorized',
      })
    }

    const cacheSession = await this.authUtil.getLogin(refreshPayload.scopeType, {
      userId: refreshPayload.user.id.toString(),
      userToken: refreshPayload.loginToken,
    })
    if (cacheSession.jti !== refreshPayload.jti) {
      throw new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'auth.error.refreshTokenInvalid',
      })
    }

    try {
      const payload = this.serializeUserData(customer)
      const session = this.authUtil.createSession(payload, refreshPayload)

      const events = [
        this.activityLogService.prepare({
          action: EnumActivityLogAction.customerRefreshToken,
          customerId: customer.id,
        }),
      ]

      await Promise.all([
        this.authUtil.updateLogin(
          refreshPayload.scopeType,
          cacheSession,
          {
            jti: session.jti,
            userToken: session.loginToken,
          },
          session.tokens.expiresIn,
        ),
        this.prisma.customer.update({
          where: { id: customer.id, deletedAt: null },
          data: {
            loginDate: session.loginDate,
            loginToken: session.loginToken,
            sessions: {
              update: {
                where: {
                  userToken: session.loginToken,
                },
                data: {
                  jti: session.jti,
                },
              },
            },
          },
        }),
      ])
      this.activityLogService.stagePrepared(events)

      return session.tokens
    } catch (err: unknown) {
      throw new InternalServerErrorException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'http.serverError.internalServerError',
        _error: err,
      })
    }
  }

  private async increasePasswordAttempt(user: TCustomer): Promise<void> {
    await this.prisma.customer.update({
      data: { passwordAttempt: { increment: 1 } },
      where: { id: user.id },
    })
  }

  createPassword(password: string): IAuthPassword {
    return this.authUtil.passwordCreate(password)
  }

  async changePassword(
    customer: TCustomer,
    dto: CustomerChangePasswordRequestDto,
  ): Promise<TCustomer> {
    const passwordAttempt = await this.authUtil.getPasswordAttempt()
    const maxPasswordAttempt = await this.authUtil.getMaxPasswordAttempt()
    if (passwordAttempt && customer.passwordAttempt >= maxPasswordAttempt) {
      throw new BadRequestException({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'auth.error.passwordAttemptMax',
      })
    }

    const matchPassword = await this.authUtil.passwordVerify(dto.oldPassword, customer.password)
    if (!matchPassword) {
      await this.increasePasswordAttempt(customer)
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'auth.error.passwordNotMatch',
      })
    }

    const newMatchPassword = this.authUtil.passwordVerify(dto.newPassword, customer.password)
    if (newMatchPassword) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'auth.error.newPasswordMustDifference',
      })
    }

    const { passwordHash } = this.authUtil.passwordCreate(dto.newPassword)
    return await this.prisma.customer.update({
      data: { password: passwordHash, passwordAttempt: 0 },
      where: { id: customer.id },
    })
  }

  async resetPassword(dto: CustomerResetPasswordRequestDto): Promise<TCustomer> {
    const customer = await this.matchOrFail({ phone: dto.phone })

    const { passwordHash } = this.authUtil.passwordCreate(dto.password)
    return await this.prisma.customer.update({
      data: { password: passwordHash, passwordAttempt: 0 },
      where: { id: customer.id },
    })
  }

  async sendPOPT(phone: string, options: ICustomerVerifySendPOTPOptions): Promise<string> {
    const verifyData = await this.customerUtil.randomToken(EnumVerificationChannel.SMS, {
      customerData: { phone },
      method: options.method,
      numeric: true,
      length: this.config.get<number>('auth.otp.length'),
      seconds: this.config.get<number>('auth.otp.ttl'),
      maxAttempts: this.config.get<number>('auth.otp.maxAttempts'),
    })

    const reqLanguage = options?.language || ScopeContext.getReqLang()
    const phoneContent = FileUtil.readTemplate(options.template.fileName, reqLanguage)
    const phoneMessage = this.message.setMessage(phoneContent, {
      customLanguage: reqLanguage,
      properties: {
        code: verifyData.code,
        ...(options?.template?.messageProperties || {}),
      },
    })

    options.drivers.forEach(driver => {
      this.smsDispatcher.dispatchAsync(driver, {
        phone,
        message: phoneMessage,
      })
    })

    return verifyData.code
  }

  async sendEOPT(email: string, options: ICustomerVerifySendEOTPOptions): Promise<string> {
    const verifyData = await this.customerUtil.randomToken(EnumVerificationChannel.EMAIL, {
      customerData: { email },
      method: options.method,
      hashed: true,
      seconds: this.config.get<number>('auth.token.ttl'),
      length: this.config.get<number>('auth.token.length'),
      maxAttempts: this.config.get<number>('auth.token.maxAttempts'),
    })

    const reqLanguage = options?.language || ScopeContext.getReqLang()
    const emailContent = FileUtil.readTemplate(options.template.fileName, reqLanguage)
    const emailMessage = this.message.setMessage(emailContent, {
      customLanguage: reqLanguage,
      properties: {
        token: verifyData.code,
        subject: this.message.setMessage(options.subject, { customLanguage: reqLanguage }),
        ...(options?.template?.messageProperties || {}),
      },
    })

    await this.mailer.send({
      to: email,
      html: emailMessage,
    })

    return verifyData.code
  }

  async approveToken(token: string, options: ICustomerVerifyApproveOptions): Promise<boolean> {
    const approved = await this.customerUtil.approveToken(token, options)
    return approved
  }

  async verifyToken(token: string, options: ICustomerVerifyCheckOptions): Promise<boolean> {
    const verified = await this.customerUtil.checkToken(token, options)

    if (!verified) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'auth.error.tokenInvalid',
      })
    }
    return true
  }

  async verifyCustomer(where: Prisma.CustomerWhereInput): Promise<TCustomer> {
    const customer = await this.matchOrFail(where)
    if (!customer.isActive) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'auth.error.blocked',
      })
    }

    return customer
  }
}
