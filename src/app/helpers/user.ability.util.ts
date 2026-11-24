import { Prisma } from '@runtime/prisma-client'
import {
  EnumAuthAbilityAction,
  EnumAuthAbilityContext,
  EnumAuthAbilitySubject,
} from 'app/enums/user.enum'
import { IAuthAbilityDataContext, IAuthAbilityDataTitle } from 'lib/nest-auth'
import { AppUtil, EnumAppLanguage, IMessageField, ScopeContext, StrUtil } from 'lib/nest-core'

// cspell:disable
export class UserAbilityUtil {
  static get contexts(): { [context: string]: IAuthAbilityDataContext } {
    return {
      [EnumAuthAbilityContext.DASHBOARD]: {
        title: {
          [EnumAppLanguage.EN]: 'Dashboard',
          [EnumAppLanguage.VI]: 'Bảng điều khiển',
        },
        subjects: [EnumAuthAbilitySubject.DASHBOARD],
      },

      [EnumAuthAbilityContext.USER_MANAGEMENT]: {
        title: {
          [EnumAppLanguage.EN]: 'User Management',
          [EnumAppLanguage.VI]: 'Quản lý người dùng',
        },
        subjects: [EnumAuthAbilitySubject.USER],
      },

      [EnumAuthAbilityContext.CUSTOMER_MANAGEMENT]: {
        title: {
          [EnumAppLanguage.EN]: 'Customership',
          [EnumAppLanguage.VI]: 'Khách hàng',
        },
        subjects: [EnumAuthAbilitySubject.CUSTOMER, EnumAuthAbilitySubject.CUSTOMER_NOTIFICATION],
      },

      [EnumAuthAbilityContext.MARKETING_MANAGEMENT]: {
        title: {
          [EnumAppLanguage.EN]: 'Marketing',
          [EnumAppLanguage.VI]: 'Tiếp thị',
        },
        subjects: [
          EnumAuthAbilitySubject.NOTIFICATION,
          EnumAuthAbilitySubject.PUSH,
          EnumAuthAbilitySubject.PUSH_GROUP,
        ],
      },

      [EnumAuthAbilityContext.LOCATION_MANAGEMENT]: {
        title: {
          [EnumAppLanguage.EN]: 'Location',
          [EnumAppLanguage.VI]: 'Địa chỉ',
        },
        subjects: [EnumAuthAbilitySubject.COUNTRY, EnumAuthAbilitySubject.DISTRICT],
      },

      [EnumAuthAbilityContext.SETTING_MANAGEMENT]: {
        title: {
          [EnumAppLanguage.EN]: 'Settings',
          [EnumAppLanguage.VI]: 'Cài đặt',
        },
        subjects: [
          EnumAuthAbilitySubject.ROLE,
          EnumAuthAbilitySubject.CONTENT,
          EnumAuthAbilitySubject.API_KEY,
          EnumAuthAbilitySubject.APP_VERSION,
        ],
      },
    }
  }

  static get subjects(): { [subject: string]: IAuthAbilityDataTitle } {
    return {
      [EnumAuthAbilitySubject.DASHBOARD]: {
        [EnumAppLanguage.EN]: 'Dashboard',
        [EnumAppLanguage.VI]: 'Bảng điều khiển',
      },
      [EnumAuthAbilitySubject.SETTING]: {
        [EnumAppLanguage.EN]: 'Settings',
        [EnumAppLanguage.VI]: 'Cài đặt',
      },
      [EnumAuthAbilitySubject.API_KEY]: {
        [EnumAppLanguage.EN]: 'Api Keys',
        [EnumAppLanguage.VI]: 'Api Keys',
      },
      [EnumAuthAbilitySubject.APP_VERSION]: {
        [EnumAppLanguage.EN]: 'App Versions',
        [EnumAppLanguage.VI]: 'Phiên bản',
      },
      [EnumAuthAbilitySubject.USER]: {
        [EnumAppLanguage.EN]: 'Users',
        [EnumAppLanguage.VI]: 'Người dùng',
      },
      [EnumAuthAbilitySubject.ROLE]: {
        [EnumAppLanguage.EN]: 'Roles',
        [EnumAppLanguage.VI]: 'Vai trò',
      },
      [EnumAuthAbilitySubject.POLICY]: {
        [EnumAppLanguage.EN]: 'Policies',
        [EnumAppLanguage.VI]: 'Quyền hạn',
      },
      [EnumAuthAbilitySubject.CONTENT]: {
        [EnumAppLanguage.EN]: 'Information & Policies',
        [EnumAppLanguage.VI]: 'Thông tin & Chính sách',
      },
      [EnumAuthAbilitySubject.COUNTRY]: {
        [EnumAppLanguage.EN]: 'Countries',
        [EnumAppLanguage.VI]: 'Quốc gia',
      },
      [EnumAuthAbilitySubject.DISTRICT]: {
        [EnumAppLanguage.EN]: 'Districts',
        [EnumAppLanguage.VI]: 'Quận/Huyện',
      },
      [EnumAuthAbilitySubject.NOTIFICATION]: {
        [EnumAppLanguage.EN]: 'Campaigns',
        [EnumAppLanguage.VI]: 'Chiến dịch',
      },
      [EnumAuthAbilitySubject.PUSH]: {
        [EnumAppLanguage.EN]: 'Pushes',
        [EnumAppLanguage.VI]: 'Gửi thông báo',
      },
      [EnumAuthAbilitySubject.PUSH_GROUP]: {
        [EnumAppLanguage.EN]: 'Push Groups',
        [EnumAppLanguage.VI]: 'Nhóm thông báo',
      },
      [EnumAuthAbilitySubject.CUSTOMER]: {
        [EnumAppLanguage.EN]: 'Customers',
        [EnumAppLanguage.VI]: 'Khách hàng',
      },
      [EnumAuthAbilitySubject.CUSTOMER_NOTIFICATION]: {
        [EnumAppLanguage.EN]: 'Customer Notifications',
        [EnumAppLanguage.VI]: 'Thông báo khách hàng',
      },
      [EnumAuthAbilitySubject.CUSTOMER_PUSH]: {
        [EnumAppLanguage.EN]: 'Customer Pushes',
        [EnumAppLanguage.VI]: 'Lịch sử gửi tin',
      },
    }
  }

  private static getInvisiblePolicies(): EnumAuthAbilitySubject[] {
    return [
      EnumAuthAbilitySubject.POLICY,
      EnumAuthAbilitySubject.SETTING,
      EnumAuthAbilitySubject.COUNTRY,
      EnumAuthAbilitySubject.DISTRICT,
      EnumAuthAbilitySubject.PUSH,
    ]
  }

  private static getDisablePolicies(): EnumAuthAbilitySubject[] {
    return []
  }

  private static getImportablePolicies(): EnumAuthAbilitySubject[] {
    return []
  }

  private static getExportablePolicies(): EnumAuthAbilitySubject[] {
    return []
  }

  private static getCustomActionPolicies(): Record<string, EnumAuthAbilityAction[]> {
    return {
      [EnumAuthAbilitySubject.DASHBOARD]: [EnumAuthAbilityAction.READ],
      [EnumAuthAbilitySubject.CONTENT]: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.UPDATE],
      [EnumAuthAbilitySubject.API_KEY]: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.UPDATE],
      [EnumAuthAbilitySubject.APP_VERSION]: [
        EnumAuthAbilityAction.READ,
        EnumAuthAbilityAction.UPDATE,
      ],
      [EnumAuthAbilitySubject.CUSTOMER_NOTIFICATION]: [EnumAuthAbilityAction.READ],
      [EnumAuthAbilitySubject.NOTIFICATION]: [
        EnumAuthAbilityAction.READ,
        EnumAuthAbilityAction.CREATE,
        EnumAuthAbilityAction.UPDATE,
      ],
      [EnumAuthAbilitySubject.PUSH]: [EnumAuthAbilityAction.READ],
      [EnumAuthAbilitySubject.PUSH_GROUP]: [
        EnumAuthAbilityAction.READ,
        EnumAuthAbilityAction.CREATE,
        EnumAuthAbilityAction.UPDATE,
      ],
    }
  }

  private static getSubjectActions(subject: EnumAuthAbilitySubject): EnumAuthAbilityAction[] {
    const subjectImports = this.getImportablePolicies()
    const subjectExports = this.getExportablePolicies()
    const subjectCRUDs = this.getCustomActionPolicies()

    const actions = subjectCRUDs[subject] || [
      EnumAuthAbilityAction.READ,
      EnumAuthAbilityAction.CREATE,
      EnumAuthAbilityAction.UPDATE,
      EnumAuthAbilityAction.DELETE,
    ]

    if (subjectImports.includes(subject)) {
      actions.push(EnumAuthAbilityAction.IMPORT)
    }
    if (subjectExports.includes(subject)) {
      actions.push(EnumAuthAbilityAction.EXPORT)
    }

    return actions
  }

  private static getSubjectContext(subject: EnumAuthAbilitySubject): string {
    for (const context in this.contexts) {
      const subjects = this.contexts[context].subjects
      if (subjects.includes(subject)) {
        return context
      }
    }
    return null
  }

  private static getSubjectPath(subject: EnumAuthAbilitySubject): string {
    return StrUtil.kebabCase(subject)
  }

  static getFullPolicyData(): Prisma.PolicyUncheckedCreateInput[] {
    const _disables = UserAbilityUtil.getDisablePolicies()
    const _invisibles = UserAbilityUtil.getInvisiblePolicies()

    const policies: Prisma.PolicyUncheckedCreateInput[] = []
    Object.values(EnumAuthAbilitySubject).forEach(subject => {
      const actions = UserAbilityUtil.getSubjectActions(subject)
      policies.push({
        subject,
        path: UserAbilityUtil.getSubjectPath(subject),
        title: this.subjects[subject],
        context: UserAbilityUtil.getSubjectContext(subject),
        bitwise: UserAbilityUtil.map2Bitwise(actions),
        isActive: !_disables.includes(subject),
        isVisible: !_invisibles.includes(subject),
      })
    })
    return policies
  }

  static map2Actions(bitwise: number = 0): EnumAuthAbilityAction[] {
    return Object.values(EnumAuthAbilityAction).filter((_, index) => (bitwise & (1 << index)) !== 0)
  }

  static map2Bitwise(actions: EnumAuthAbilityAction[] = []): number {
    const allActions = Object.values(EnumAuthAbilityAction)

    return actions.reduce((bitwise, action) => {
      const index = allActions.indexOf(action)
      if (index === -1) {
        return bitwise
      }
      return bitwise | (1 << index)
    }, 0)
  }

  static getSubjectOrder(subject: string): number {
    let sorting = 10
    for (const context in this.contexts) {
      const subjects = this.contexts[context].subjects
      if (subjects.includes(subject)) {
        const index = subjects.indexOf(subject)
        return sorting + index
      }
      sorting += 10
    }
    return sorting
  }

  static getContextTitle(context: string): string {
    return AppUtil.getMessageValue(this.contexts[context]?.title, {
      language: ScopeContext.getReqLang(),
      fallbackValue: '',
    })
  }

  static getPolicyTitle(title: Prisma.JsonValue): string {
    return AppUtil.getMessageValue(title as unknown as IMessageField<string>, {
      language: ScopeContext.getReqLang(),
      fallbackValue: '',
    })
  }
}

// cspell:enable
