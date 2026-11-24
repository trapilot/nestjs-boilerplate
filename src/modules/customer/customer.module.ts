import { Module } from '@nestjs/common'
import { CUSTOMER_AUTH_VALIDATOR } from './constants/customer.constant'
import { CustomerAuth } from './helpers/customer.auth'
import { CustomerUtil } from './helpers/customer.util'
import { CustomerListener } from './listeners/customer.listener'
import { CustomerService } from './services/customer.service'

@Module({
  providers: [
    {
      provide: CUSTOMER_AUTH_VALIDATOR,
      useClass: CustomerAuth,
    },
    CustomerService,
    CustomerUtil,
    CustomerListener,
  ],
  exports: [CUSTOMER_AUTH_VALIDATOR, CustomerService],
})
export class CustomerModule {}
