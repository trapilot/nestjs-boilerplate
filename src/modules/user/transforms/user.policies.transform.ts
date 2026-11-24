import { UserAbilityUtil } from 'app/helpers/user.ability.util'
import { Transform } from 'class-transformer'
import { ArrUtil } from 'lib/nest-core'
import { UserUtil } from '../helpers/user.util'
import {
  IContextUserPolicy,
  IUserDataPolicy,
  IUserProfilePolicy,
  IUserTransformOptions,
} from '../interfaces/user.auth.interface'

export function ToUserPolicies(): (target: object, key: string) => void {
  return Transform(({ obj: user }: IUserTransformOptions): IUserProfilePolicy[] => {
    // console.log({ ToUserPolicies: user })
    if (user?.role !== undefined) {
      const grpContextPolicy: IContextUserPolicy = {}
      const userPolicies: IUserDataPolicy[] = []
      const userRole = UserUtil.parseRole(user)

      for (const userRolePolicy of userRole?.pivotPolicies ?? []) {
        const policy = userRolePolicy?.policy
        const roleBitwise = userRolePolicy?.bitwise ?? 0

        if (roleBitwise && policy && policy.isActive && policy.context) {
          const { context, isActive, isVisible, path, subject, sorting, bitwise } = policy
          userPolicies.push({
            context,
            isActive,
            isVisible,
            sorting,
            subject,
            path,
            title: UserAbilityUtil.getPolicyTitle(policy.title),
            bitwise: roleBitwise & bitwise,
          })
        }
      }

      // sorted
      userPolicies.sort((a, b) => a.sorting - b.sorting)

      // grouped
      for (const userPolicy of userPolicies) {
        const { context, isVisible, path, title, subject, bitwise } = userPolicy
        if (!(context in grpContextPolicy)) {
          grpContextPolicy[context] = {
            group: false,
            title: UserAbilityUtil.getContextTitle(context),
            context,
            subjects: [],
          }
        }

        const exist = grpContextPolicy[context].subjects.find(data => data.subject === subject)
        if (exist) {
          exist.actions = ArrUtil.unique([
            ...exist.actions,
            ...UserAbilityUtil.map2Actions(bitwise),
          ])
        } else {
          grpContextPolicy[context].subjects.push({
            path,
            title,
            context,
            subject,
            isVisible,
            actions: UserAbilityUtil.map2Actions(bitwise),
          })
          if (!grpContextPolicy[context].group) {
            const activeSubjects = grpContextPolicy[context].subjects.filter(
              subject => subject.isVisible,
            )
            grpContextPolicy[context].group = activeSubjects.length > 1
          }
        }
      }
      return Object.values(grpContextPolicy)
    }
  })
}
