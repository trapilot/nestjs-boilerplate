import { Module } from '@nestjs/common'
import { ActivityLogAdminController } from 'modules/activity-log/controllers/activity-log.admin.controller'
import { ApiKeyModule } from 'modules/api-key/api-key.module'
import { ApiKeyAdminController } from 'modules/api-key/controllers/api-key.admin.controller'
import { AppVersionModule } from 'modules/app-version/app-version.module'
import { AppVersionAdminController } from 'modules/app-version/controllers/app-version.admin.controller'
import { DashboardAdminController } from 'modules/dashboard/controllers/dashboard.admin.controller'
import { DashboardModule } from 'modules/dashboard/dashboard.module'
import { CustomerAdminController } from 'modules/customer/controllers/customer.admin.controller'
import { CustomerModule } from 'modules/customer/customer.module'
import { NotificationAdminController } from 'modules/notification/controllers/notification.admin.controller'
import { NotificationModule } from 'modules/notification/notification.module'
import { ContentAdminController } from 'modules/content/controllers/content.admin.controller'
import { ContentModule } from 'modules/content/content.module'
import { PolicyAdminController } from 'modules/policy/controllers/policy.admin.controller'
import { PolicyModule } from 'modules/policy/policy.module'
import { RoleAdminController } from 'modules/role/controllers/role.admin.controller'
import { RoleModule } from 'modules/role/role.module'
import { SettingAdminController } from 'modules/setting/controllers/setting.admin.controller'
import { SettingModule } from 'modules/setting/setting.module'
import { UserAdminController } from 'modules/user/controllers/user.admin.controller'
import { UserAuthController } from 'modules/user/controllers/user.auth.controller'
import { UserModule } from 'modules/user/user.module'

@Module({
  controllers: [
    UserAuthController,
    UserAdminController,
    ActivityLogAdminController,
    SettingAdminController,
    DashboardAdminController,
    ApiKeyAdminController,
    AppVersionAdminController,
    RoleAdminController,
    PolicyAdminController,
    CustomerAdminController,
    ContentAdminController,
    NotificationAdminController,
  ],
  imports: [
    UserModule,
    SettingModule,
    DashboardModule,
    ApiKeyModule,
    AppVersionModule,
    RoleModule,
    PolicyModule,
    CustomerModule,
    ContentModule,
    NotificationModule,
  ],
})
export class RoutesAdminModule {}
