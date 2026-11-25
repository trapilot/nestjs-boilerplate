import {
  ForbiddenException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  PipeTransform,
  Scope,
} from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import { IRequestApp } from 'lib/nest-core'
import { PrismaService } from 'lib/nest-prisma'
import { RoleUtil } from '../helpers/role.util'

/** Forbids touching a role that is more powerful than the requester's own role. */
@Injectable({ scope: Scope.REQUEST })
export class RoleLimitedTypePipe implements PipeTransform {
  constructor(
    @Inject(REQUEST) protected readonly request: IRequestApp,
    private readonly prisma: PrismaService,
  ) {}

  async transform(roleId: number): Promise<number> {
    const requesterType = this.request?.user?.user?.roleType
    const role = await this.prisma.role.findUnique({ where: { id: roleId } })
    if (!role) {
      throw new NotFoundException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'module.role.notFound',
      })
    }

    if (!RoleUtil.canAccess(requesterType, role.type)) {
      throw new ForbiddenException({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'module.role.forbidden',
      })
    }

    return roleId
  }
}
