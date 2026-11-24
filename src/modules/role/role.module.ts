import { Module } from '@nestjs/common'
import { PolicyModule } from 'modules/policy/policy.module'
import { RoleService } from './services/role.service'

@Module({
  providers: [RoleService],
  exports: [RoleService],
  imports: [PolicyModule],
})
export class RoleModule {}
