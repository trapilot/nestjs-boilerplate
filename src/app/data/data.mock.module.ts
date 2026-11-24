import { Module } from '@nestjs/common'
import { CustomerModule } from 'modules/customer/customer.module'
import { CustomerMock } from './mocks/customer.mock'

@Module({
  providers: [CustomerMock],
  imports: [CustomerModule],
})
export class DataMockModule {}
