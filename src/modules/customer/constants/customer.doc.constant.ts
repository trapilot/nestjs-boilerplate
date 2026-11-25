export const CUSTOMER_DOC_OPERATION = 'Customer'
export const CUSTOMER_DOC_AUTH_OPERATION = 'Authentication'

export const CUSTOMER_DOC_ADMIN_QUERY_LIST = [
  {
    name: 'phone',
    allowEmptyValue: true,
    required: false,
    type: 'string',
  },
  {
    name: 'email',
    allowEmptyValue: true,
    required: false,
    type: 'string',
  },
  {
    name: 'name',
    allowEmptyValue: true,
    required: false,
    type: 'string',
  },
  {
    name: 'isActive',
    allowEmptyValue: true,
    required: false,
    type: 'boolean',
  },
]
