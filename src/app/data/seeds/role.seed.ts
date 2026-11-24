import { EnumRoleType } from '@runtime/prisma-client'
import { CommandMigrateBase } from 'lib/nest-core'
import { PrismaService } from 'lib/nest-prisma'
import { Command } from 'nest-commander'

@Command({
  name: 'seed:role',
  description: 'Seed roles',
})
export class RoleSeed extends CommandMigrateBase {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  async up(): Promise<void> {
    for (const { name, type, description } of this.userRoles) {
      await this.prisma.role.upsert({
        where: { name },
        update: { type, isActive: true },
        create: { name, type, description, isActive: true },
      })
    }
  }

  async down(): Promise<void> {}

  private get userRoles(): { name: string; type: EnumRoleType; description: string }[] {
    return [
      {
        name: 'Super Admin',
        type: EnumRoleType.SUPER_ADMIN,
        description: 'Able to login to the web portal as the Super Admin role ',
      },
      {
        name: 'Admin',
        type: EnumRoleType.ADMIN,
        description: 'Able to login to the web portal as the Admin role ',
      },
      {
        name: 'Tester',
        type: EnumRoleType.USER,
        description: 'Able to login to the web portal as the Tester role ',
      },
    ]
  }
}
