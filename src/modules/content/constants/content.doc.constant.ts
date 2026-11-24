import { EnumContentType } from '../enums/content.enum'

export const CONTENT_DOC_OPERATION = 'Content'

export const CONTENT_DOC_ADMIN_QUERY_LIST = [
  // {
  //   name: 'categoryId',
  //   allowEmptyValue: false,
  //   required: false,
  //   type: 'number',
  // },
  {
    name: 'type',
    allowEmptyValue: false,
    required: false,
    type: 'string',
    enum: [EnumContentType.ABOUT_US, EnumContentType.PRIVACY, EnumContentType.TERM_AND_CONDITION],
    enumName: 'EnumContentType',
  },
]
