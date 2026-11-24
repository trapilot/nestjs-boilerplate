import { UserAbilityUtil } from 'app/helpers/user.ability.util'
import { Transform } from 'class-transformer'
import { IRoleResponseTransform, TRole } from '../interfaces/role.interface'

export function ToRolePolicies(): (target: object, key: string) => void {
  return Transform(({ obj: role }: { obj: TRole }): IRoleResponseTransform[] => {
    // console.log({ ToRolePolicies: role })
    if (role?.fullPolicies !== undefined) {
      const mappedPolicies: Record<string, IRoleResponseTransform> = {}
      const rolesPolicies = role?.pivotPolicies ?? []
      const fullPolicies = role?.fullPolicies ?? []
      for (const policy of fullPolicies) {
        const rolePolicy = rolesPolicies.find(p => p.policyId === policy.id)
        const roleBit = rolePolicy?.bitwise ?? 0
        if (policy.isActive && policy.context) {
          const { context, subject, title, bitwise } = policy
          if (!(subject in mappedPolicies)) {
            mappedPolicies[subject] = {
              title: UserAbilityUtil.getPolicyTitle(title),
              context,
              subject,
              actions: [],
            }
          }

          const actions = UserAbilityUtil.map2Actions(bitwise)
          for (const action of actions) {
            mappedPolicies[subject].actions.push({
              [action]: (roleBit & UserAbilityUtil.map2Bitwise([action])) > 0,
            })
          }
        }
      }
      return Object.values(mappedPolicies)
    }
  })
}
