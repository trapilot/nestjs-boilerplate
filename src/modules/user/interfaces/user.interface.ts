import { Role, User, UserSession, UserTwoFactor } from '@runtime/prisma-client'

export type TUser = User & {
  twoFactor?: UserTwoFactor
  sessions?: UserSession[]
  role?: Role
}

export interface IUserCreatedOptions {
  roleId: number
}

export interface IUserUpdateOptions extends IUserCreatedOptions {
  updatedAt?: Date
}
