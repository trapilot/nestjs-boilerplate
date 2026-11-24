import { EnumRoleType } from '@runtime/prisma-client'

/**
 * Rank of each role type. A lower rank means a more powerful role.
 * This is the single source of truth for the role hierarchy.
 */
export const ROLE_TYPE_RANK: Record<EnumRoleType, number> = {
  [EnumRoleType.SUPER_ADMIN]: 0,
  [EnumRoleType.ADMIN]: 1,
  [EnumRoleType.USER]: 2,
}

/** Rank given to a requester without a role: weaker than every role type. */
export const ROLE_RANK_NONE = Number.MAX_SAFE_INTEGER

export class RoleUtil {
  static rank(type?: EnumRoleType | null): number {
    return type ? (ROLE_TYPE_RANK[type] ?? ROLE_RANK_NONE) : ROLE_RANK_NONE
  }

  /** A requester can view, manage or assign a role only when its rank is >= the requester's. */
  static canAccess(requesterType: EnumRoleType | null | undefined, target: EnumRoleType): boolean {
    return this.rank(target) >= this.rank(requesterType)
  }

  /** Role types the requester is allowed to view, manage or assign. */
  static accessibleTypes(requesterType?: EnumRoleType | null): EnumRoleType[] {
    return (Object.keys(ROLE_TYPE_RANK) as EnumRoleType[]).filter(type =>
      this.canAccess(requesterType, type),
    )
  }
}
