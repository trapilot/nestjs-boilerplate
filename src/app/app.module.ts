import { HttpStatus, Module, RequestMethod } from '@nestjs/common'
import { ValidationError } from 'class-validator'
import { NestAuthModule } from 'lib/nest-auth'
import {
  APP_ENV,
  APP_NAME,
  ENV_CONFIG,
  EnumAppEnvironment,
  EnumRoutePath,
  NestCoreModule,
  StrUtil,
} from 'lib/nest-core'
import {
  NestPrismaModule,
  PrismaWorkerConsumer,
  PrismaWorkerProducer,
  PrismaWorkerScanner,
} from 'lib/nest-prisma'
import { NestWebModule, ValidateException } from 'lib/nest-web'
import { AppVersionModule } from 'modules/app-version/app-version.module'
import { AppVersionCheckMiddleware } from 'modules/app-version/middleware/app-version.check.middleware'
import { CustomerEmailWelcomeHandler } from 'modules/customer/handlers/customer.email-welcome.handler'
import { CustomerModule } from 'modules/customer/customer.module'
import { NotificationDispatchPushHandler } from 'modules/notification/handlers/notification.dispatch-push.handler'
import { NotificationSendPushHandler } from 'modules/notification/handlers/notification.send-notification.handler'
import { NotificationModule } from 'modules/notification/notification.module'
import { SettingCheckMaintenanceMiddleware } from 'modules/setting/middleware/setting.check-maintenance.middleware'
import { SettingModule } from 'modules/setting/setting.module'
import configs from '../configs'
import { ActivityLogModule } from 'modules/activity-log/activity-log.module'
import { DataMockModule } from './data/data.mock.module'
import { EnumAuthAbilityAction, EnumAuthAbilitySubject } from './enums/user.enum'
import { UserAbilityFactory } from './helpers/user.ability.factory'
import { RoutesAdminModule } from './routes/routes.admin.module'
import { RoutesAppModule } from './routes/routes.app.module'
import { RoutesPublicModule } from './routes/routes.public.module'
import { RoutesWebModule } from './routes/routes.web.module'

@Module({
  imports: [
    NestCoreModule.forRoot({
      configs,
      cache: true,
      envFilePath: ENV_CONFIG,
    }),
    NestAuthModule.forRoot({
      abilityFactory: UserAbilityFactory,
      subjects: EnumAuthAbilitySubject,
      actions: EnumAuthAbilityAction,
    }),
    NestPrismaModule.forRoot({
      multiTenant: StrUtil.isTrue(process.env.APP_TENANT),
      replication: StrUtil.isTrue(process.env.DATABASE_REPLICATION),
      debug: StrUtil.isTrue(process.env.DATABASE_DEBUG),
    }),
    NestWebModule.forRoot({
      metrics: {
        defaultMetricsEnabled: false, // disable metrics
        defaultLabels: {
          app: APP_NAME,
          environment: APP_ENV,
        },
      },
      router: {
        enabled: StrUtil.isTrue(process.env.APP_ROUTER),
        admin: true,
        validator: {
          transform: true,
          whitelist: true,
          skipNullProperties: false,
          skipUndefinedProperties: false,
          skipMissingProperties: false,
          forbidUnknownValues: false,
          // stopAtFirstError: false,
          stopAtFirstError: true,
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          exceptionFactory: async (errors: ValidationError[]) => new ValidateException(errors),
        },
        logger: {
          autoLogging: StrUtil.isNot(process.env.APP_ENV, EnumAppEnvironment.DEVELOPMENT),
          excludeRoutes: [
            { path: '*', method: RequestMethod.OPTIONS },
            { path: 'activity-logs/*spat', method: RequestMethod.ALL },
            { path: 'v:version/activity-logs/*spat', method: RequestMethod.ALL },
          ],
        },
        middlewares: [
          {
            middleware: SettingCheckMaintenanceMiddleware,
            module: SettingModule,
            excludeRoutes: [
              { path: 'admin/auth/login', method: RequestMethod.POST },
              { path: 'admin/auth/refresh', method: RequestMethod.POST },
              { path: 'admin/settings', method: RequestMethod.ALL },
              { path: 'admin/settings/:splat', method: RequestMethod.ALL },
            ],
          },
          {
            middleware: AppVersionCheckMiddleware,
            module: AppVersionModule,
            applyRoutes: [
              { path: 'app/*spat', method: RequestMethod.ALL },
              { path: 'v:version/app/*spat', method: RequestMethod.ALL },
              { path: 'web/*spat', method: RequestMethod.ALL },
              { path: 'v:version/web/*spat', method: RequestMethod.ALL },
            ],
          },
        ],
        routes: [
          { path: EnumRoutePath.CMS, module: RoutesAdminModule },
          { path: EnumRoutePath.APP, module: RoutesAppModule },
          { path: EnumRoutePath.WEB, module: RoutesWebModule },
          { path: EnumRoutePath.PUB, module: RoutesPublicModule },
        ],
      },
      worker: {
        enabled: StrUtil.isTrue(process.env.APP_WORKER),
        config: {
          concurrency: 50,
          maxRunningJobs: 50, // locked per node (running + waiting); keep close to concurrency
          pollIntervalMs: 2000,
          maintainIntervalMs: 10_000,
          recoveryIntervalMs: 10_000,
          heartbeatIntervalMs: 5000,
          shutdownTimeoutMs: 25_000, // platform grace period must be longer
          jobTimeoutMs: 5 * 60_000, // per attempt; a handler's timeoutMs overrides it
        },
        producer: PrismaWorkerProducer,
        consumer: PrismaWorkerConsumer,
        scanner: PrismaWorkerScanner,
        modules: [
          {
            module: CustomerModule,
            handlers: [CustomerEmailWelcomeHandler],
          },
          {
            module: NotificationModule,
            handlers: [NotificationDispatchPushHandler, NotificationSendPushHandler],
          },
        ],
      },
    }),

    ActivityLogModule, // global: activity log service + flush interceptor
    DataMockModule, // fakes user behaviour (AUTO_GEN_MODE); stubbed out by `pnpm build:prod`
  ],
})
export class AppModule {}
