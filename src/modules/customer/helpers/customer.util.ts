import { BadRequestException, HttpStatus, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EnumVerificationChannel } from '@runtime/prisma-client'
import { EnumActivityLogAction } from 'modules/activity-log/enums/activity-log.enum'
import { EnumAuthLoginType } from 'lib/nest-auth'
import { HelperService } from 'lib/nest-core'
import { PrismaService } from 'lib/nest-prisma'
import {
  ICustomerVerifyApproveOptions,
  ICustomerVerifyCheckOptions,
  ICustomerVerifyCreateOptions,
  ICustomerVerifyIdentity,
  ICustomerVerifyRandomOptions,
  TCustomerVerification,
} from '../interfaces/customer.interface'

@Injectable()
export class CustomerUtil {
  private readonly _logger = new Logger(CustomerUtil.name)

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly helperService: HelperService,
  ) {}

  async randomToken(
    channel: EnumVerificationChannel,
    options: ICustomerVerifyRandomOptions,
  ): Promise<TCustomerVerification> {
    const isInspector = this.checkIsInspector(options?.customerData)

    if (!isInspector) {
      const nowDate = this.helperService.dateNow()
      const dateRange = this.helperService.dateRange(nowDate)

      const todayAttempts = await this.prisma.customerVerification.count({
        where: {
          channel,
          type: options.method,
          customerId: options?.customerData?.customerId,
          phone: options?.customerData?.phone,
          email: options?.customerData?.email,
          // isActive: true,
          createdAt: {
            gte: dateRange.startOfDay,
            lte: dateRange.endOfDay,
          },
        },
      })

      if (todayAttempts >= options.maxAttempts) {
        throw new BadRequestException({
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'auth.error.tokenAttemptMax',
        })
      }
    }

    const verifyData = this.createVerifyData({
      ...options,
      inspector: isInspector,
    })

    return await this.prisma.customerVerification.create({
      data: {
        channel,
        type: options.method,
        email: options?.customerData?.email,
        phone: options?.customerData?.phone,
        customerId: options?.customerData?.customerId,
        code: verifyData.code,
        expiresAt: verifyData.expired,
      },
    })
  }

  async checkToken(token: string, options: ICustomerVerifyCheckOptions): Promise<boolean> {
    if (!token) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'auth.error.tokenRequired',
      })
    }

    return await this.prisma.customerVerification.exists({
      where: {
        channel: options.channel,
        type: options.method,
        email: options?.email,
        phone: options?.phone,
        customerId: options?.customerId,
        code: token,
        isActive: true,
        isVerified: true,
        isExpired: false,
      },
    })
  }

  async approveToken(token: string, options: ICustomerVerifyApproveOptions): Promise<boolean> {
    const lastVerifyData = await this.prisma.customerVerification.findFirst({
      where: {
        channel: options.channel,
        type: options.method,
        email: options?.email,
        phone: options?.phone,
        customerId: options?.customerId,
      },
      orderBy: { id: 'desc' },
    })

    if (!lastVerifyData || !lastVerifyData.isActive) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'auth.error.tokenInvalid',
      })
    }

    const nowDate = this.helperService.dateNow()
    if (lastVerifyData.code !== token || nowDate >= lastVerifyData.expiresAt) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'auth.error.tokenExpired',
      })
    }

    if (!lastVerifyData.isVerified) {
      await this.prisma.customerVerification.update({
        where: { id: lastVerifyData.id },
        data: { isActive: true, isVerified: true, verifiedAt: nowDate },
      })
    }

    return true
  }

  private checkIsInspector(customerData: Partial<ICustomerVerifyIdentity>): boolean {
    if (customerData?.email) {
      const inspectors = this.config.get<string[]>('auth.token.email.inspectors', [])
      if (inspectors.length) {
        return inspectors.includes('*') || inspectors.includes(customerData.email)
      }
    }

    if (customerData?.phone) {
      const inspectors = this.config.get<string[]>('auth.token.phone.inspectors', [])
      if (inspectors.length) {
        return inspectors.includes('*') || inspectors.includes(customerData.phone)
      }
    }
    return false
  }

  private createVerifyData(options: ICustomerVerifyCreateOptions): { code: string; expired: Date } {
    const digits = '1234567890'
    const sinceDate = this.helperService.dateNow()
    const untilDate = this.helperService.dateForward(sinceDate, { seconds: options.seconds })

    const code = options?.inspector
      ? digits.repeat(Math.ceil(length / digits.length)).slice(0, length)
      : this.helperService.randomString(options.length, {
          numeric: options.numeric,
          upperCase: true,
        })

    if (options?.hashed) {
      const hashed = this.helperService.base64Encrypt(
        JSON.stringify({
          code,
          hash: this.helperService.randomString(options.length, { safe: true }),
          sinceDate,
          untilDate,
        }),
      )
      return { expired: untilDate, code: hashed }
    }

    return { expired: untilDate, code }
  }

  static getActivityLogin(loginType: EnumAuthLoginType): EnumActivityLogAction {
    switch (loginType) {
      case EnumAuthLoginType.SOCIAL_GOOGLE:
        return EnumActivityLogAction.customerLoginGoogle
      case EnumAuthLoginType.SOCIAL_APPLE:
        return EnumActivityLogAction.customerLoginApple
      default:
        return EnumActivityLogAction.customerLoginCredential
    }
  }
}
