import { EnumRoleType } from '@runtime/prisma-client'

export interface IUserProfilePolicy {
  group: boolean
  title: string
  context: string
  subjects: {
    path: string
    title: string
    context: string
    subject: string
    isVisible: boolean
    actions: string[]
  }[]
}

export interface IContextUserPolicy {
  [context: string]: IUserProfilePolicy
}

export interface IUserRoleTransformOptions {
  key?: boolean
  type?: boolean
}

export interface IUserTransformOptions {
  value: object
  key: string
  obj: IUserTransformData
}

export interface IUserTransformData {
  roleId: number
  role: IUserDataRole
}

export interface IUserDataRole {
  id: number
  type: EnumRoleType
  isActive: boolean
  pivotPolicies: {
    bitwise: number
    policy: IUserDataPolicy
  }[]
}

export interface IUserDataPolicy {
  context: string
  subject: string
  path: string
  title: string
  sorting: number
  bitwise: number
  isActive: boolean
  isVisible: boolean
}
