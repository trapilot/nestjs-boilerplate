import { EnumActivityLogAction } from '../enums/activity-log.enum'
import {
  ActivityLogActorMetadataDto,
  ActivityLogCustomerTargetMetadataDto,
  ActivityLogEmptyMetadataDto,
  ActivityLogResourceMetadataDto,
  ActivityLogRoleMetadataDto,
  ActivityLogUserTargetMetadataDto,
} from '../dtos/activity-log.metadata.dto'
import { EnumActivityLogOwner } from '../enums/activity-log.enum'
import { IActivityLogActionContract } from '../interfaces/activity-log.interface'

/**
 * Per-action contract: who owns the row and the strict schema its metadata must match.
 * Typed as a full Record, so adding an enum value without a contract fails to compile.
 */
export const ActivityLogActionContract: Record<EnumActivityLogAction, IActivityLogActionContract> =
  {
    // Customer: public paths (no JWT) and own account
    [EnumActivityLogAction.customerSignedUp]: {
      owner: EnumActivityLogOwner.CUSTOMER,
      metadata: ActivityLogEmptyMetadataDto,
    },
    [EnumActivityLogAction.customerLoginCredential]: {
      owner: EnumActivityLogOwner.CUSTOMER,
      metadata: ActivityLogEmptyMetadataDto,
    },
    [EnumActivityLogAction.customerLoginGoogle]: {
      owner: EnumActivityLogOwner.CUSTOMER,
      metadata: ActivityLogEmptyMetadataDto,
    },
    [EnumActivityLogAction.customerLoginApple]: {
      owner: EnumActivityLogOwner.CUSTOMER,
      metadata: ActivityLogEmptyMetadataDto,
    },
    [EnumActivityLogAction.customerLoginFailed]: {
      owner: EnumActivityLogOwner.CUSTOMER,
      metadata: ActivityLogEmptyMetadataDto,
    },
    [EnumActivityLogAction.customerRefreshToken]: {
      owner: EnumActivityLogOwner.CUSTOMER,
      metadata: ActivityLogEmptyMetadataDto,
    },
    [EnumActivityLogAction.customerForgotPassword]: {
      owner: EnumActivityLogOwner.CUSTOMER,
      metadata: ActivityLogEmptyMetadataDto,
    },
    [EnumActivityLogAction.customerResetPassword]: {
      owner: EnumActivityLogOwner.CUSTOMER,
      metadata: ActivityLogEmptyMetadataDto,
    },
    [EnumActivityLogAction.customerUpdateProfile]: {
      owner: EnumActivityLogOwner.PAYLOAD_CUSTOMER,
      metadata: ActivityLogEmptyMetadataDto,
    },
    [EnumActivityLogAction.customerUpdatePhotoProfile]: {
      owner: EnumActivityLogOwner.PAYLOAD_CUSTOMER,
      metadata: ActivityLogEmptyMetadataDto,
    },
    [EnumActivityLogAction.customerDeleteSelf]: {
      owner: EnumActivityLogOwner.PAYLOAD_CUSTOMER,
      metadata: ActivityLogEmptyMetadataDto,
    },
    // Customer: target rows of admin actions (createdBy = the admin)
    [EnumActivityLogAction.customerCreatedByAdmin]: {
      owner: EnumActivityLogOwner.CUSTOMER,
      metadata: ActivityLogActorMetadataDto,
    },
    [EnumActivityLogAction.customerUpdatedByAdmin]: {
      owner: EnumActivityLogOwner.CUSTOMER,
      metadata: ActivityLogActorMetadataDto,
    },
    [EnumActivityLogAction.customerBlocked]: {
      owner: EnumActivityLogOwner.CUSTOMER,
      metadata: ActivityLogActorMetadataDto,
    },
    [EnumActivityLogAction.customerUpdateStatus]: {
      owner: EnumActivityLogOwner.CUSTOMER,
      metadata: ActivityLogActorMetadataDto,
    },
    [EnumActivityLogAction.customerUpdatePhotoProfileByAdmin]: {
      owner: EnumActivityLogOwner.CUSTOMER,
      metadata: ActivityLogActorMetadataDto,
    },
    // Staff user: public paths (no JWT) and own account
    [EnumActivityLogAction.userSignedUp]: {
      owner: EnumActivityLogOwner.USER,
      metadata: ActivityLogEmptyMetadataDto,
    },
    [EnumActivityLogAction.userLoginCredential]: {
      owner: EnumActivityLogOwner.USER,
      metadata: ActivityLogEmptyMetadataDto,
    },
    [EnumActivityLogAction.userLoginGoogle]: {
      owner: EnumActivityLogOwner.USER,
      metadata: ActivityLogEmptyMetadataDto,
    },
    [EnumActivityLogAction.userLoginApple]: {
      owner: EnumActivityLogOwner.USER,
      metadata: ActivityLogEmptyMetadataDto,
    },
    [EnumActivityLogAction.userLoginFailed]: {
      owner: EnumActivityLogOwner.USER,
      metadata: ActivityLogEmptyMetadataDto,
    },
    [EnumActivityLogAction.userRefreshToken]: {
      owner: EnumActivityLogOwner.USER,
      metadata: ActivityLogEmptyMetadataDto,
    },
    [EnumActivityLogAction.userUpdateProfile]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogEmptyMetadataDto,
    },
    [EnumActivityLogAction.userUpdatePhotoProfile]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogEmptyMetadataDto,
    },
    [EnumActivityLogAction.userChangePassword]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogEmptyMetadataDto,
    },
    [EnumActivityLogAction.userChangeConfirmPassword]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogEmptyMetadataDto,
    },
    // Staff user: target rows of admin actions (createdBy = the admin)
    [EnumActivityLogAction.userCreatedByAdmin]: {
      owner: EnumActivityLogOwner.USER,
      metadata: ActivityLogActorMetadataDto,
    },
    [EnumActivityLogAction.userUpdatedByAdmin]: {
      owner: EnumActivityLogOwner.USER,
      metadata: ActivityLogActorMetadataDto,
    },
    [EnumActivityLogAction.userUpdatePhotoProfileByAdmin]: {
      owner: EnumActivityLogOwner.USER,
      metadata: ActivityLogActorMetadataDto,
    },
    // Admin: management actions, owned by the acting staff user
    [EnumActivityLogAction.adminUserCreate]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogUserTargetMetadataDto,
    },
    [EnumActivityLogAction.adminUserUpdate]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogUserTargetMetadataDto,
    },
    [EnumActivityLogAction.adminUserUpdatePhotoProfile]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogUserTargetMetadataDto,
    },
    [EnumActivityLogAction.adminCustomerCreate]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogCustomerTargetMetadataDto,
    },
    [EnumActivityLogAction.adminCustomerUpdate]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogCustomerTargetMetadataDto,
    },
    [EnumActivityLogAction.adminCustomerUpdateStatus]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogCustomerTargetMetadataDto,
    },
    [EnumActivityLogAction.adminCustomerUpdatePhotoProfile]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogCustomerTargetMetadataDto,
    },
    [EnumActivityLogAction.adminRoleCreate]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogRoleMetadataDto,
    },
    [EnumActivityLogAction.adminRoleUpdate]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogRoleMetadataDto,
    },
    [EnumActivityLogAction.adminRoleUpdateStatus]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogRoleMetadataDto,
    },
    [EnumActivityLogAction.adminRoleDelete]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogRoleMetadataDto,
    },
    [EnumActivityLogAction.adminPolicyCreate]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminPolicyUpdate]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminApiKeyCreate]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminApiKeyUpdate]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminApiKeyReset]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminApiKeyRenew]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminApiKeyUpdateStatus]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminApiKeyDelete]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminAppVersionCreate]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminAppVersionUpdate]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminAppVersionUpdateStatus]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminAppVersionDelete]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminContentCreate]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminContentUpdate]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminContentUpdateStatus]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminContentDelete]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminCountryCreate]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminCountryUpdate]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminCountryDelete]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminDistrictCreate]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminDistrictUpdate]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminDistrictDelete]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminNotificationCreate]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminNotificationUpdate]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminNotificationUpdateStatus]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminNotificationDelete]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminSettingCreate]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
    [EnumActivityLogAction.adminSettingUpdate]: {
      owner: EnumActivityLogOwner.PAYLOAD_USER,
      metadata: ActivityLogResourceMetadataDto,
    },
  }
