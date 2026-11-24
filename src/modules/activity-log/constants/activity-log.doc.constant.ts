import { EnumActivityLogAction } from '../enums/activity-log.enum'

export const ACTIVITY_LOG_DOC_OPERATION = 'Activity Log'

export const ACTIVITY_LOG_DOC_APP_QUERY_LIST = [
  {
    name: 'action',
    allowEmptyValue: true,
    required: false,
    enum: EnumActivityLogAction,
    enumName: 'EnumActivityLogAction',
  },
]
export const ACTIVITY_LOG_DOC_APP_PARAM_LIST = []

export const ACTIVITY_LOG_DOC_ADMIN_QUERY_LIST = [
  {
    name: 'action',
    allowEmptyValue: true,
    required: false,
    enum: EnumActivityLogAction,
    enumName: 'EnumActivityLogAction',
  },
]
export const ACTIVITY_LOG_DOC_ADMIN_PARAM_USER = [
  {
    name: 'userId',
    allowEmptyValue: false,
    required: true,
    type: 'number',
  },
]
export const ACTIVITY_LOG_DOC_ADMIN_PARAM_CUSTOMER = [
  {
    name: 'customerId',
    allowEmptyValue: false,
    required: true,
    type: 'number',
  },
]
