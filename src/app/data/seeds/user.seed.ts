import { EnumRoleType } from '@runtime/prisma-client'
import { AuthUtil, EnumAuthSignUpFrom } from 'lib/nest-auth'
import { CommandMigrateBase } from 'lib/nest-core'
import { PrismaService } from 'lib/nest-prisma'
import { Command } from 'nest-commander'

@Command({
  name: 'seed:user',
  description: 'Seed users',
})
export class UserSeed extends CommandMigrateBase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authUtil: AuthUtil,
  ) {
    super()
  }

  async up(): Promise<void> {
    for (const user of this.users) {
      if (!user.email || !user.password) {
        continue
      }

      const { passwordHash } = this.authUtil.passwordCreate(user.password)
      const role = await this.prisma.role.findFirst({
        where: { type: user.roleType },
        orderBy: { id: 'asc' },
      })

      await this.prisma.user.upsert({
        where: { email: user.email },
        create: {
          email: user.email,
          roleId: role?.id,
          password: passwordHash,
          isActive: true,
          isPhoneVerified: true,
          isEmailVerified: true,
          type: user?.type,
          signUpFrom: EnumAuthSignUpFrom.CMD,
        },
        update: {
          roleId: role?.id,
          password: passwordHash,
          isActive: true,
          type: user?.type,
        },
      })
    }
  }

  async down(): Promise<void> {}

  private get users(): {
    email: string
    password: string
    type: string
    roleType: EnumRoleType
    phone?: string
  }[] {
    return [
      {
        email: process.env.MOCK_SADMIN_EMAIL,
        password: process.env.MOCK_ADMIN_PASS,
        type: 'SUPER_ADMIN',
        roleType: EnumRoleType.SUPER_ADMIN,
      },
      {
        phone: process.env.MOCK_ADMIN_PHONE,
        email: process.env.MOCK_ADMIN_EMAIL,
        password: process.env.MOCK_ADMIN_PASS,
        type: 'USER',
        roleType: EnumRoleType.ADMIN,
      },
      {
        phone: process.env.MOCK_TESTER_PHONE,
        email: process.env.MOCK_TESTER_EMAIL,
        password: process.env.MOCK_TESTER_PASS,
        type: 'USER',
        roleType: EnumRoleType.USER,
      },
    ]
  }
}
