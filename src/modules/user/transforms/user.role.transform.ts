import { Transform, plainToInstance } from 'class-transformer'
import { RoleResponseBelongDto } from 'modules/role/dtos/role.response.detail.dto'
import { UserUtil } from '../helpers/user.util'
import { IUserRoleTransformOptions, IUserTransformOptions } from '../interfaces/user.auth.interface'

export function ToUserRole(
  options?: IUserRoleTransformOptions,
): (target: object, key: string) => void {
  return Transform(({ obj: user }: IUserTransformOptions) => {
    if (user?.role !== undefined) {
      const userRole = UserUtil.parseRole(user)

      if (options?.key) {
        return userRole?.id
      }
      if (options?.type) {
        return userRole?.type
      }

      return userRole
        ? plainToInstance(RoleResponseBelongDto, userRole, { excludeExtraneousValues: true })
        : undefined
    }
  })
}
