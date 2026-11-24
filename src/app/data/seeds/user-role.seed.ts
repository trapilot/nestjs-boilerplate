import { EnumRoleType } from '@runtime/prisma-client'
import { CommandMigrateBase, HelperService } from 'lib/nest-core'
import { PrismaService } from 'lib/nest-prisma'
import { Command, Option } from 'nest-commander'

@Command({
  name: 'seed:user-role',
  description: 'Grant all policies to the super admin and admin roles',
})
export class UserRoleSeed extends CommandMigrateBase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helperService: HelperService,
  ) {
    super()
  }

  @Option({
    flags: '-ids, --users [string]',
    description: 'List of customers, separator by comma',
  })
  parseIds(val: string): number[] {
    return (val ?? '').split(',').map(s => Number(s))
  }

  async up(): Promise<void> {
    // Super admin and admin roles receive every policy
    const adminRoles = await this.prisma.role.findMany({
      where: { type: { in: [EnumRoleType.SUPER_ADMIN, EnumRoleType.ADMIN] } },
      include: { pivotPolicies: true },
    })

    for (const adminRole of adminRoles) {
      const policies = await this.prisma.policy.findMany({
        select: { id: true, bitwise: true },
      })
      const oldPolicyIds = adminRole.pivotPolicies.map(rp => rp.policyId)
      const newPolicyIds = policies.map(p => p.id)

      const diffIds = this.helperService.arrayDifference(oldPolicyIds, newPolicyIds)
      const oldIds = this.helperService.arrayIntersection(oldPolicyIds, newPolicyIds)
      const addIds = this.helperService.arrayIntersection(diffIds, newPolicyIds)
      const delIds = this.helperService.arrayDifference(diffIds, addIds)

      await this.prisma.$transaction(async tx => {
        await tx.rolesPolicies.deleteMany({
          where: { roleId: adminRole.id, policyId: { in: delIds } },
        })
        await tx.rolesPolicies.createMany({
          data: addIds.map(policyId => {
            return {
              policyId,
              roleId: adminRole.id,
              bitwise: policies.find(p => p.id === policyId)?.bitwise ?? 0,
            }
          }),
        })
      })

      // update bitwise
      for (const id of oldIds) {
        const bitwise = policies.find(p => p.id === id)?.bitwise ?? 0
        await this.prisma.rolesPolicies.updateMany({
          data: { bitwise },
          where: { roleId: adminRole.id, policyId: id },
        })
      }
    }
  }

  async down(): Promise<void> {}
}
