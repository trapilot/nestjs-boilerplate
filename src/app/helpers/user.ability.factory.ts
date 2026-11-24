import { AbilityBuilder } from '@casl/ability'
import { createPrismaAbility } from '@casl/prisma'
import { EnumRoleType } from '@runtime/prisma-client'
import {
  AuthContext,
  AuthFactory,
  IAuthAbility,
  IAuthAbilityRule,
  IAuthJwtPayload,
  IAuthPayloadPolicy,
} from 'lib/nest-auth'

export class UserAbilityFactory extends AuthFactory {
  private get subjects(): string[] {
    if (!this._subjects) {
      const { subjects } = AuthContext.getConfig()
      this._subjects = subjects
    }
    return this._subjects
  }

  private get actions(): string[] {
    if (!this._actions) {
      const { actions } = AuthContext.getConfig()
      this._actions = actions
    }
    return this._actions
  }

  defineFromRequest(payload: IAuthJwtPayload): IAuthAbilityRule {
    const { can, build } = new AbilityBuilder<IAuthAbilityRule>(createPrismaAbility)

    // Super admin bypasses policies; the role type comes from the DB-backed JWT payload
    if (payload.user?.roleType === EnumRoleType.SUPER_ADMIN) {
      can('manage', 'all')
      return build()
    }

    const userPolicies = this.parseFromRequest(payload)
    for (const policy of userPolicies) {
      const abilities = this.mappingFromRequest(policy)

      for (const ability of abilities) {
        can(ability.action, ability.subject)
      }
    }

    return build()
  }

  parseFromRequest(payload: IAuthJwtPayload): IAuthAbility[] {
    const abilities: IAuthAbility[] = []
    const policies: IAuthPayloadPolicy[] = payload.user?.policies || []

    for (const subjectIndex of Object.keys(policies)) {
      const subject = this.subjects[subjectIndex]
      const bitwise = policies[subjectIndex] ?? 0

      const actions = this.actions.filter((_, index) => (bitwise & (1 << index)) !== 0)
      if (actions.length > 0) {
        abilities.push({ subject, actions })
      }
    }
    return abilities
  }
}
