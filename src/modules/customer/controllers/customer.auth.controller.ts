import { Controller, HttpStatus, Inject, Post, Put } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { EnumVerificationChannel, EnumVerificationMethod } from '@runtime/prisma-client'
import {
  AuthJwtPayload,
  AuthJwtToken,
  AuthResponseLoginDto,
  AuthResponseTokenDto,
  AuthSocialAppleProtected,
  AuthSocialGoogleProtected,
  EnumAuthLoginFrom,
  EnumAuthLoginType,
  EnumAuthLoginWith,
  EnumAuthScopeType,
} from 'lib/nest-auth'
import {
  ApiRequestData,
  IResponseData,
  RequestBody,
  RequestUserAgent,
  RequestUserFrom,
  RequestUserIp,
  RequestUserOTP,
  RequestUserOTT,
  RequestUserToken,
} from 'lib/nest-web'
import { IResult } from 'ua-parser-js'
import { CUSTOMER_AUTH_VALIDATOR } from '../constants/customer.constant'
import { CUSTOMER_DOC_AUTH_OPERATION } from '../constants/customer.doc.constant'
import { CustomerResetPasswordRequestDto } from '../dtos/customer.request.reset-password.dto'
import { CustomerSignInRequestDto } from '../dtos/customer.request.sign-in.dto'
import { CustomerRequestSignUpDto } from '../dtos/customer.request.sign-up.dto'
import {
  CustomerRequestOTPDto,
  CustomerRequestTokenDto,
} from '../dtos/customer.request.verify-profile'
import { CustomerProfileResponseDto } from '../dtos/customer.response.profile.dto'
import { CustomerAuth } from '../helpers/customer.auth'
import { CustomerService } from '../services/customer.service'

@ApiTags(CUSTOMER_DOC_AUTH_OPERATION)
@Controller({ version: '1', path: '/auth' })
export class CustomerAuthController {
  constructor(
    @Inject(CUSTOMER_AUTH_VALIDATOR) protected readonly customerAuth: CustomerAuth,
    protected readonly customerService: CustomerService,
  ) {}

  @ApiRequestData({
    summary: CUSTOMER_DOC_AUTH_OPERATION,
    docExclude: false,
    docExpansion: false,
    userOTP: true,
    rateLimit: {
      short: { limit: 3, seconds: 1 },
      medium: { limit: 10, seconds: 60 },
    },
    response: {
      dto: CustomerProfileResponseDto,
    },
  })
  @Post('/sign-up')
  async signUp(
    @RequestBody() body: CustomerRequestSignUpDto,
    @RequestUserOTP() otp: string,
  ): Promise<IResponseData> {
    await this.customerAuth.verifyToken(otp, {
      channel: EnumVerificationChannel.SMS,
      method: EnumVerificationMethod.SIGN_UP,
      phone: body.phone,
    })

    const { password, ...data } = body
    const customer = await this.customerService.create(
      {
        ...data,
        isPhoneVerified: true,
      },
      this.customerAuth.createPassword(password),
    )

    return { data: customer }
  }

  @ApiRequestData({
    summary: CUSTOMER_DOC_AUTH_OPERATION,
    docExclude: false,
    docExpansion: false,
    userAgent: true,
    userToken: true,
    rateLimit: {
      short: { limit: 3, seconds: 1 },
      medium: { limit: 10, seconds: 60 },
    },
    response: {
      dto: AuthResponseLoginDto,
      statusCode: HttpStatus.OK,
    },
  })
  @Post('/login')
  async loginWithCredential(
    @RequestUserIp() userIp: string,
    @RequestUserAgent() userAgent: IResult,
    @RequestUserToken() userToken: string,
    @RequestUserFrom() userFrom: EnumAuthLoginFrom,
    @RequestBody() body: CustomerSignInRequestDto,
  ): Promise<IResponseData> {
    const customer = await this.customerAuth.validateCredential(body)
    const auth = await this.customerAuth.login(customer, {
      userIp,
      userAgent,
      userToken,
      userSession: {
        scopeType: EnumAuthScopeType.CUSTOMER,
        loginType: EnumAuthLoginType.CREDENTIAL,
        loginWith: EnumAuthLoginWith.PHONE,
        loginFrom: userFrom,
        loginRotate: false,
      },
    })
    return { data: auth }
  }

  @ApiRequestData({
    summary: CUSTOMER_DOC_AUTH_OPERATION,
    docExclude: true,
    docExpansion: false,
    google: true,
    userAgent: true,
    userToken: true,
    rateLimit: {
      short: { limit: 3, seconds: 1 },
      medium: { limit: 10, seconds: 60 },
    },
    response: {
      dto: AuthResponseTokenDto,
    },
  })
  @AuthSocialGoogleProtected()
  @Post('/login/social/google')
  async loginWithGoogle(
    @RequestUserIp() userIp: string,
    @RequestUserAgent() userAgent: IResult,
    @RequestUserToken() userToken: string,
    @RequestUserFrom() userFrom: EnumAuthLoginFrom,
    @AuthJwtPayload<string>('user.email') email: string,
  ): Promise<IResponseData> {
    const customer = await this.customerAuth.validateOAuthEmail({ email })
    const auth = await this.customerAuth.login(customer, {
      userIp,
      userAgent,
      userToken,
      userSession: {
        scopeType: EnumAuthScopeType.CUSTOMER,
        loginType: EnumAuthLoginType.SOCIAL_GOOGLE,
        loginWith: EnumAuthLoginWith.EMAIL,
        loginFrom: userFrom,
      },
    })
    return { data: auth }
  }

  @ApiRequestData({
    summary: CUSTOMER_DOC_AUTH_OPERATION,
    docExclude: true,
    docExpansion: false,
    apple: true,
    userAgent: true,
    userToken: true,
    rateLimit: {
      short: { limit: 3, seconds: 1 },
      medium: { limit: 10, seconds: 60 },
    },
    response: {
      dto: AuthResponseTokenDto,
    },
  })
  @AuthSocialAppleProtected()
  @Post('/login/social/apple')
  async loginWithApple(
    @RequestUserIp() userIp: string,
    @RequestUserAgent() userAgent: IResult,
    @RequestUserToken() userToken: string,
    @RequestUserFrom() userFrom: EnumAuthLoginFrom,
    @AuthJwtPayload('user.email') email: string,
  ): Promise<IResponseData> {
    const customer = await this.customerAuth.validateOAuthEmail({ email })
    const auth = await this.customerAuth.login(customer, {
      userIp,
      userAgent,
      userToken,
      userSession: {
        scopeType: EnumAuthScopeType.CUSTOMER,
        loginType: EnumAuthLoginType.SOCIAL_APPLE,
        loginWith: EnumAuthLoginWith.EMAIL,
        loginFrom: userFrom,
      },
    })
    return { data: auth }
  }

  @ApiRequestData({
    summary: CUSTOMER_DOC_AUTH_OPERATION,
    docExclude: false,
    docExpansion: false,
    jwtRefreshToken: true,
    rateLimit: {
      short: { limit: 3, seconds: 1 },
      medium: { limit: 5, seconds: 60 },
    },
    response: {
      dto: AuthResponseTokenDto,
      statusCode: HttpStatus.OK,
    },
  })
  @Post('/refresh')
  async refresh(
    @RequestUserIp() userIp: string,
    @RequestUserAgent() userAgent: IResult,
    @AuthJwtToken() refreshToken: string,
    @AuthJwtPayload('user.id') customerId: number,
  ): Promise<IResponseData> {
    const customer = await this.customerAuth.getUserData(customerId)
    const auth = await this.customerAuth.refresh(customer, refreshToken, {
      userIp,
      userAgent,
    })

    return { data: auth }
  }

  @ApiRequestData({
    summary: CUSTOMER_DOC_AUTH_OPERATION,
    docExclude: false,
    docExpansion: false,
    userOTP: true,
    rateLimit: {
      short: { limit: 3, seconds: 1 },
      medium: { limit: 5, seconds: 60 },
    },
    response: {
      dto: CustomerProfileResponseDto,
    },
  })
  @Put('/reset-password')
  async resetPassword(
    @RequestBody() body: CustomerResetPasswordRequestDto,
    @RequestUserOTP() otp: string,
  ): Promise<IResponseData> {
    await this.customerAuth.verifyToken(otp, {
      channel: EnumVerificationChannel.SMS,
      method: EnumVerificationMethod.RESET_PASSWORD,
      phone: body.phone,
    })

    const updated = await this.customerAuth.resetPassword(body)
    return { data: updated }
  }

  @ApiRequestData({
    summary: CUSTOMER_DOC_AUTH_OPERATION,
    docExclude: false,
    docExpansion: false,
    rateLimit: {
      short: { limit: 3, seconds: 1 },
      medium: { limit: 5, seconds: 60 },
    },
  })
  @Post('/sign-up/request-potp')
  async requestSignUpPopt(@RequestBody() body: CustomerRequestOTPDto): Promise<IResponseData> {
    const code = await this.customerAuth.sendPOPT(body.phone, {
      method: EnumVerificationMethod.SIGN_UP,
      subject: 'message.sign-up.subject',
      template: {
        fileName: 'sign-up.phone.html',
      },
      drivers: [],
    })
    return { data: { code } }
  }

  @ApiRequestData({
    summary: CUSTOMER_DOC_AUTH_OPERATION,
    docExclude: false,
    docExpansion: false,
    userOTP: true,
    rateLimit: {
      short: { limit: 3, seconds: 1 },
      medium: { limit: 5, seconds: 60 },
    },
  })
  @Post('/sign-up/verify-potp')
  async verifySignUpPopt(
    @RequestBody() body: CustomerRequestOTPDto,
    @RequestUserOTP() otp: string,
  ): Promise<IResponseData> {
    const status = await this.customerAuth.approveToken(otp, {
      channel: EnumVerificationChannel.SMS,
      method: EnumVerificationMethod.SIGN_UP,
      phone: body.phone,
    })
    return { data: { status } }
  }

  @ApiRequestData({
    summary: CUSTOMER_DOC_AUTH_OPERATION,
    docExclude: false,
    docExpansion: false,
    rateLimit: {
      short: { limit: 3, seconds: 1 },
      medium: { limit: 5, seconds: 60 },
    },
  })
  @Post('/sign-up/request-eopt')
  async requestSignUpEopt(@RequestBody() body: CustomerRequestTokenDto): Promise<IResponseData> {
    const code = await this.customerAuth.sendEOPT(body.email, {
      method: EnumVerificationMethod.SIGN_UP,
      subject: 'message.sign-up.subject',
      template: {
        fileName: 'sign-up.email.html',
      },
    })
    return { data: { code } }
  }

  @ApiRequestData({
    summary: CUSTOMER_DOC_AUTH_OPERATION,
    docExclude: false,
    docExpansion: false,
    userOTT: true,
    rateLimit: {
      short: { limit: 3, seconds: 1 },
      medium: { limit: 5, seconds: 60 },
    },
  })
  @Post('/sign-up/verify-eopt')
  async verifySignUpEopt(
    @RequestBody() body: CustomerRequestTokenDto,
    @RequestUserOTT() token: string,
  ): Promise<IResponseData> {
    const status = await this.customerAuth.approveToken(token, {
      channel: EnumVerificationChannel.EMAIL,
      method: EnumVerificationMethod.SIGN_UP,
      email: body.email,
    })
    return { data: { status } }
  }

  @ApiRequestData({
    summary: CUSTOMER_DOC_AUTH_OPERATION,
    docExclude: false,
    docExpansion: false,
    rateLimit: {
      short: { limit: 3, seconds: 1 },
      medium: { limit: 5, seconds: 60 },
    },
  })
  @Post('/reset-password/request-potp')
  async requestResetPasswordPotp(
    @RequestBody() body: CustomerRequestOTPDto,
  ): Promise<IResponseData> {
    const { locale } = await this.customerAuth.verifyCustomer({ phone: body.phone })
    const code = await this.customerAuth.sendPOPT(body.phone, {
      method: EnumVerificationMethod.RESET_PASSWORD,
      language: locale,
      subject: 'message.resetPassword.subject',
      template: {
        fileName: 'reset-password.phone.html',
      },
      drivers: [],
    })
    return { data: { code } }
  }

  @ApiRequestData({
    summary: CUSTOMER_DOC_AUTH_OPERATION,
    docExclude: false,
    docExpansion: false,
    userOTP: true,
    rateLimit: {
      short: { limit: 3, seconds: 1 },
      medium: { limit: 5, seconds: 60 },
    },
  })
  @Post('/reset-password/verify-potp')
  async verifyResetPasswordPotp(
    @RequestBody() body: CustomerRequestOTPDto,
    @RequestUserOTP() otp: string,
  ): Promise<IResponseData> {
    const status = await this.customerAuth.approveToken(otp, {
      channel: EnumVerificationChannel.SMS,
      method: EnumVerificationMethod.SIGN_UP,
      phone: body.phone,
    })
    return { data: { status } }
  }
}
