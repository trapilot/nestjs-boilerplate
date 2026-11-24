import { Policy, RolesPolicies } from '@runtime/prisma-client'

export type TRolePolicy = RolesPolicies

export type TPolicy = Policy & {
  pivotRoles?: TRolePolicy[]
}
