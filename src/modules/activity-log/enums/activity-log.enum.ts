/**
 * Who owns an activity-log row, decided per action by `ActivityLogActionContract`.
 * - PAYLOAD_USER / PAYLOAD_CUSTOMER: the authenticated caller (JWT). `prepare` must not pass any
 *   owner field; the interceptor resolves it at flush and rejects a JWT of the other scope.
 * - USER / CUSTOMER: the affected account, passed explicitly to `prepare` (`userId` / `customerId`).
 *   Used on public paths without a JWT (sign-up, login) and for target rows of admin actions.
 */
export enum EnumActivityLogOwner {
  PAYLOAD_USER = 'PAYLOAD_USER',
  PAYLOAD_CUSTOMER = 'PAYLOAD_CUSTOMER',
  USER = 'USER',
  CUSTOMER = 'CUSTOMER',
}

/**
 * Every recorded user behaviour. Stored as a plain string in `activity_logs.action`, so adding
 * a value needs no migration. Naming follows the owner of the row:
 *   customer*  rows owned by a Customer (own actions, or `...ByAdmin` when an admin acted on them)
 *   user*      rows owned by an admin staff User acting on their own account (or `...ByAdmin`)
 *   admin*     rows owned by the admin staff User who performed a management action
 * Append new values; never rename or reuse one (stored rows keep the old value).
 */
export enum EnumActivityLogAction {
  customerSignedUp = 'customerSignedUp',
  customerLoginCredential = 'customerLoginCredential',
  customerLoginGoogle = 'customerLoginGoogle',
  customerLoginApple = 'customerLoginApple',
  customerLoginFailed = 'customerLoginFailed',
  customerRefreshToken = 'customerRefreshToken',
  customerForgotPassword = 'customerForgotPassword',
  customerResetPassword = 'customerResetPassword',
  customerUpdateProfile = 'customerUpdateProfile',
  customerUpdatePhotoProfile = 'customerUpdatePhotoProfile',
  customerDeleteSelf = 'customerDeleteSelf',
  customerCreatedByAdmin = 'customerCreatedByAdmin',
  customerUpdatedByAdmin = 'customerUpdatedByAdmin',
  customerBlocked = 'customerBlocked',
  customerUpdateStatus = 'customerUpdateStatus',
  customerUpdatePhotoProfileByAdmin = 'customerUpdatePhotoProfileByAdmin',

  userSignedUp = 'userSignedUp',
  userLoginCredential = 'userLoginCredential',
  userLoginGoogle = 'userLoginGoogle',
  userLoginApple = 'userLoginApple',
  userLoginFailed = 'userLoginFailed',
  userRefreshToken = 'userRefreshToken',
  userUpdateProfile = 'userUpdateProfile',
  userUpdatePhotoProfile = 'userUpdatePhotoProfile',
  userChangePassword = 'userChangePassword',
  userChangeConfirmPassword = 'userChangeConfirmPassword',
  userCreatedByAdmin = 'userCreatedByAdmin',
  userUpdatedByAdmin = 'userUpdatedByAdmin',
  userUpdatePhotoProfileByAdmin = 'userUpdatePhotoProfileByAdmin',

  adminUserCreate = 'adminUserCreate',
  adminUserUpdate = 'adminUserUpdate',
  adminUserUpdatePhotoProfile = 'adminUserUpdatePhotoProfile',
  adminCustomerCreate = 'adminCustomerCreate',
  adminCustomerUpdate = 'adminCustomerUpdate',
  adminCustomerUpdateStatus = 'adminCustomerUpdateStatus',
  adminCustomerUpdatePhotoProfile = 'adminCustomerUpdatePhotoProfile',
  adminRoleCreate = 'adminRoleCreate',
  adminRoleUpdate = 'adminRoleUpdate',
  adminRoleUpdateStatus = 'adminRoleUpdateStatus',
  adminRoleDelete = 'adminRoleDelete',
  adminPolicyCreate = 'adminPolicyCreate',
  adminPolicyUpdate = 'adminPolicyUpdate',
  adminApiKeyCreate = 'adminApiKeyCreate',
  adminApiKeyUpdate = 'adminApiKeyUpdate',
  adminApiKeyReset = 'adminApiKeyReset',
  adminApiKeyRenew = 'adminApiKeyRenew',
  adminApiKeyUpdateStatus = 'adminApiKeyUpdateStatus',
  adminApiKeyDelete = 'adminApiKeyDelete',
  adminAppVersionCreate = 'adminAppVersionCreate',
  adminAppVersionUpdate = 'adminAppVersionUpdate',
  adminAppVersionUpdateStatus = 'adminAppVersionUpdateStatus',
  adminAppVersionDelete = 'adminAppVersionDelete',
  adminContentCreate = 'adminContentCreate',
  adminContentUpdate = 'adminContentUpdate',
  adminContentUpdateStatus = 'adminContentUpdateStatus',
  adminContentDelete = 'adminContentDelete',
  adminCountryCreate = 'adminCountryCreate',
  adminCountryUpdate = 'adminCountryUpdate',
  adminCountryDelete = 'adminCountryDelete',
  adminDistrictCreate = 'adminDistrictCreate',
  adminDistrictUpdate = 'adminDistrictUpdate',
  adminDistrictDelete = 'adminDistrictDelete',
  adminNotificationCreate = 'adminNotificationCreate',
  adminNotificationUpdate = 'adminNotificationUpdate',
  adminNotificationUpdateStatus = 'adminNotificationUpdateStatus',
  adminNotificationDelete = 'adminNotificationDelete',
  adminSettingCreate = 'adminSettingCreate',
  adminSettingUpdate = 'adminSettingUpdate',
}
