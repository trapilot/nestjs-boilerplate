import { UserAbilityUtil } from 'app/helpers/user.ability.util'
import { CommandMigrateBase, HelperService } from 'lib/nest-core'
import { PrismaService } from 'lib/nest-prisma'
import { Command } from 'nest-commander'

@Command({
  name: 'seed:policy',
  description: 'Seed policies',
})
export class PolicySeed extends CommandMigrateBase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helperService: HelperService,
  ) {
    super()
  }

  async up(): Promise<void> {
    const updatedAt = this.helperService.dateNow()
    const policies = UserAbilityUtil.getFullPolicyData()

    await this.prisma.$executeRaw`UPDATE policies SET title = NULL, context = NULL`

    for (const policy of policies) {
      const sorting = UserAbilityUtil.getSubjectOrder(policy.subject)

      await this.prisma.policy.upsert({
        where: { subject: policy.subject },
        update: { ...policy, sorting, updatedAt },
        create: { ...policy, sorting, updatedAt },
      })
    }

    await this.prisma.$transaction(async tx => {
      const removes = await tx.policy.findMany({
        where: { updatedAt: { lt: updatedAt } },
      })
      const policyIds = removes.map(p => p.id)
      await tx.rolesPolicies.deleteMany({
        where: { policyId: { in: policyIds } },
      })
      await tx.policy.deleteMany({
        where: { id: { in: policyIds } },
      })
    })
  }

  async down(): Promise<void> {}
}
