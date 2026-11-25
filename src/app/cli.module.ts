import { Module } from '@nestjs/common'
import { NestAuthModule } from 'lib/nest-auth'
import { ENV_CONFIG, NestCoreModule } from 'lib/nest-core'
import { NestPrismaModule } from 'lib/nest-prisma'
import configs from '../configs'
import { DataSeedModule } from './data/data.seed.module'
import { EnumAuthAbilityAction, EnumAuthAbilitySubject } from './enums/user.enum'
import { UserAbilityFactory } from './helpers/user.ability.factory'
import { PolicySeed } from './seeds/policy.seed'

@Module({
  imports: [
    NestCoreModule.forRoot({
      configs,
      cache: false,
      envFilePath: ENV_CONFIG,
    }),
    NestAuthModule.forRoot({
      abilityFactory: UserAbilityFactory,
      subjects: EnumAuthAbilitySubject,
      actions: EnumAuthAbilityAction,
    }),
    NestPrismaModule.forRoot({
      multiTenant: false,
      replication: false,
      debug: false,
    }),

    DataSeedModule, // seed:* commands; stubbed out by `pnpm build:prod`
  ],
  providers: [PolicySeed],
})
export class CliModule {}
