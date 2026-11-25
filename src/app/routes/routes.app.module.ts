import { Module } from '@nestjs/common'
import { CountryAppController } from 'modules/country/controllers/country.app.controller'
import { CountryModule } from 'modules/country/country.module'
import { DistrictAppController } from 'modules/district/controllers/district.app.controller'
import { DistrictModule } from 'modules/district/district.module'
import { CustomerAppController } from 'modules/customer/controllers/customer.app.controller'
import { CustomerAuthController } from 'modules/customer/controllers/customer.auth.controller'
import { CustomerModule } from 'modules/customer/customer.module'
import { ContentAppController } from 'modules/content/controllers/content.app.controller'
import { ContentModule } from 'modules/content/content.module'

@Module({
  controllers: [
    CustomerAuthController,
    CustomerAppController,
    ContentAppController,
    CountryAppController,
    DistrictAppController,
  ],
  imports: [CustomerModule, ContentModule, CountryModule, DistrictModule],
})
export class RoutesAppModule {}
