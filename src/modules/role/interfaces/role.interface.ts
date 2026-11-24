import { Role, RolesPolicies } from '@runtime/prisma-client'
import { TPolicy } from 'modules/policy/interfaces/policy.interface'
import { RolePolicyRequestCreateDto } from '../dtos/role-policy.request.create.dto'

export type TRolePolicy = RolesPolicies

export type TRole = Role & {
  pivotPolicies?: TRolePolicy[]
  fullPolicies?: TPolicy[]
}

export interface IRoleCreateOptions {
  policies: RolePolicyRequestCreateDto[]
}

export interface IRoleUpdateOptions extends IRoleCreateOptions {
  updatedAt?: Date
}

export interface IRoleResponseTransform {
  title: string
  context: string
  subject: string
  actions: {
    [key: string]: boolean
  }[]
}
