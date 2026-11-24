import { EnumAuthLoginType } from 'lib/nest-auth'
import { EnumUserActivityAction } from '../enums/user.enum'
import { IUserDataRole, IUserTransformData } from '../interfaces/user.auth.interface'

export class UserUtil {
  /** The single active role of the user, if any. */
  static parseRole(user: IUserTransformData): IUserDataRole | undefined {
    const role = user?.role
    return role?.isActive ? role : undefined
  }

  static getActivityLogin(loginType: EnumAuthLoginType): EnumUserActivityAction {
    let action: EnumUserActivityAction = undefined
    switch (loginType) {
      case EnumAuthLoginType.CREDENTIAL:
        action = EnumUserActivityAction.LOGIN_CREDENTIAL
        break
    }
    return action
  }
}
