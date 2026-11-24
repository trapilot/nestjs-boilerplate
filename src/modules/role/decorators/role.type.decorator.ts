import { ExecutionContext, createParamDecorator } from '@nestjs/common'
import { IRequestApp } from 'lib/nest-core'
import { RoleUtil } from '../helpers/role.util'

/** Prisma `where` filter limiting a role list to the types the requester may access. */
export const RequestRoleType = createParamDecorator(
  <T>(_data: string, context: ExecutionContext): T => {
    const { user } = context.switchToHttp().getRequest<IRequestApp>()
    const requesterType = user?.user?.roleType
    return { type: { in: RoleUtil.accessibleTypes(requesterType) } } as T
  },
)
