import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common'
import { EnumRoleType } from '@runtime/prisma-client'
import { IRequestFile } from 'lib/nest-core'
import { UserService } from '../services/user.service'

@Injectable()
export class UserIsSuperAdmin implements CanActivate {
  constructor(private readonly userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<IRequestFile>()
    const { user: payload } = request
    if (payload && payload?.user?.id) {
      const userId = payload.user.id
      const userData = await this.userService.findOrFail(userId, {
        include: { role: true },
      })

      if (userData.role?.isActive && userData.role.type === EnumRoleType.SUPER_ADMIN) {
        return true
      }
    }

    throw new BadRequestException({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'auth.error.abilityForbidden',
    })
  }
}
