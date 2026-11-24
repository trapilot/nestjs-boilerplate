import { EnumAuthScopeType } from 'lib/nest-auth'
import { FileUtil, StrUtil } from 'lib/nest-core'
import { EnumCustomerQueue } from '../enums/customer.enum'

export const CUSTOMER_AUTH_VALIDATOR = EnumAuthScopeType.CUSTOMER

export const CUSTOMER_UPLOAD_IMAGE_PATH = `public/uploads/images/customers`
export const CUSTOMER_UPLOAD_TASK_SIZE = FileUtil.megabytes(50)

export const CUSTOMER_QUEUE_AUTH = 'CUSTOMER_QUEUE_AUTH'
export const CUSTOMER_QUEUE_SEND_REQUEST_OTP = 'CUSTOMER_QUEUE_SEND_REQUEST_OTP'
export const CUSTOMER_QUEUE_SEND_RESET_PASSWORD = 'CUSTOMER_QUEUE_SEND_RESET_PASSWORD'

export const CUSTOMER_NUMBER_LENGTH = StrUtil.numeric(process.env.AUTH_CUSTOMER_NUMBER_LENGTH, 4)

export const CUSTOMER_QUEUE_PROC_VERSION = {
  [EnumCustomerQueue.PROC_EMAIL_WELCOME]: 1,
} as const
