import { EnumActivityLogAction } from 'modules/activity-log/enums/activity-log.enum'
import { EnumAuthLoginType } from 'lib/nest-auth'
import { IUserDataRole, IUserTransformData } from '../interfaces/user.auth.interface'

export class UserUtil {
  /** The single active role of the user, if any. */
  static parseRole(user: IUserTransformData): IUserDataRole | undefined {
    const role = user?.role
    return role?.isActive ? role : undefined
  }

  static getActivityLogin(loginType: EnumAuthLoginType): EnumActivityLogAction {
    switch (loginType) {
      case EnumAuthLoginType.SOCIAL_GOOGLE:
        return EnumActivityLogAction.userLoginGoogle
      case EnumAuthLoginType.SOCIAL_APPLE:
        return EnumActivityLogAction.userLoginApple
      default:
        return EnumActivityLogAction.userLoginCredential
    }
  }
}
