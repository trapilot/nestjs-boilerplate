import {
  Customer,
  CustomerDevice,
  CustomerSession,
  CustomerTwoFactor,
  CustomerVerification,
  EnumVerificationChannel,
  EnumVerificationMethod,
} from '@runtime/prisma-client'
import { EnumSmsDriver, TypeLeastOne } from 'lib/nest-core'

export type TCustomerVerification = CustomerVerification

export type TCustomer = Customer & {
  twoFactor?: CustomerTwoFactor
  devices?: CustomerDevice[]
  sessions?: CustomerSession[]
  verifications?: CustomerVerification[]
}

export interface ICustomerVerifyIdentity {
  email: string
  phone: string
  customerId: number
}

export interface ICustomerVerifyType {
  channel: EnumVerificationChannel
  method: EnumVerificationMethod
}

export interface ICustomerVerifyCreateOptions {
  length: number
  seconds: number
  hashed?: boolean
  numeric?: boolean
  inspector?: boolean
}

export interface ICustomerVerifyRandomOptions extends ICustomerVerifyCreateOptions {
  method: EnumVerificationMethod
  maxAttempts: number
  customerData?: Partial<ICustomerVerifyIdentity>
}

export type ICustomerVerifyCheckOptions = ICustomerVerifyType & Partial<ICustomerVerifyIdentity>
export type ICustomerVerifyApproveOptions = ICustomerVerifyType &
  TypeLeastOne<ICustomerVerifyIdentity>

export interface ICustomerVerifySendOptions {
  method: EnumVerificationMethod
  subject: string
  language?: string
  template: {
    fileName: string
    messageProperties?: Record<string, number | string>
  }
}

export interface ICustomerVerifySendPOTPOptions extends ICustomerVerifySendOptions {
  drivers: EnumSmsDriver[]
}

export interface ICustomerVerifySendEOTPOptions extends ICustomerVerifySendOptions {
  language?: string
}

export interface ICustomerEmailWelcomePayload {
  customerId: number
  customerEmail: string
}
