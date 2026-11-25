import { EnumActivityLogAction, EnumActivityLogOwnerType } from '../enums/activity-log.enum'

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
export const ACTIVITY_LOG_DOC_ADMIN_QUERY_LIST_ALL = [
  ...ACTIVITY_LOG_DOC_ADMIN_QUERY_LIST,
  {
    name: 'ownerType',
    allowEmptyValue: true,
    required: false,
    enum: EnumActivityLogOwnerType,
    enumName: 'EnumActivityLogOwnerType',
  },
  { name: 'userId', allowEmptyValue: true, required: false, type: 'number' },
  { name: 'customerId', allowEmptyValue: true, required: false, type: 'number' },
  { name: 'correlationId', allowEmptyValue: true, required: false, type: 'string' },
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
