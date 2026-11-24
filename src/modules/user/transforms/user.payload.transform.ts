import { EnumRoleType } from '@runtime/prisma-client'
import { Transform } from 'class-transformer'
import { AuthContext, IAuthPayloadPolicy } from 'lib/nest-auth'
import { UserUtil } from '../helpers/user.util'
import { IUserTransformOptions } from '../interfaces/user.auth.interface'

export function ToUserPayloadRoleId(): (target: object, key: string) => void {
  return Transform(({ obj: user }: IUserTransformOptions): number | null => {
    return UserUtil.parseRole(user)?.id ?? null
  })
}

/** Role type is always read from the database record, never from client input. */
export function ToUserPayloadRoleType(): (target: object, key: string) => void {
  return Transform(({ obj: user }: IUserTransformOptions): EnumRoleType | null => {
    return UserUtil.parseRole(user)?.type ?? null
  })
}

export function ToUserPayloadPolicies(): (target: object, key: string) => void {
  return Transform(({ obj: user }: IUserTransformOptions): IAuthPayloadPolicy => {
    const { subjects } = AuthContext.getConfig()
    const userRole = UserUtil.parseRole(user)
    const userPolicies = {}

    for (const rolePolicy of userRole?.pivotPolicies ?? []) {
      const policy = rolePolicy?.policy
      const roleBit = rolePolicy?.bitwise ?? 0
      const policyBit = policy?.bitwise ?? 0

      if (roleBit && policyBit && policy.isActive && subjects.includes(policy.subject)) {
        const subjectIndex = subjects.findIndex(subject => subject === policy.subject)
        userPolicies[subjectIndex] |= roleBit & policyBit
      }
    }
    return userPolicies
  })
}
