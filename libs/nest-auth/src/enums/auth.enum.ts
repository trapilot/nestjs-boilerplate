export enum EnumAuthSignUpFrom {
  CMD = 'cmd',
  CMS = 'cms',
  APP = 'app',
  WEB = 'web',
}

export enum EnumAuthLoginWith {
  CARD = 'card',
  EMAIL = 'email',
  PHONE = 'phone',
}

export enum EnumAuthLoginFrom {
  CLI = 'cli',
  CMS = 'cms',
  APP = 'app',
  WEB = 'web',
}

export enum EnumAuthLoginType {
  CREDENTIAL = 'credential',
  WHATSAPP = 'whatapp',
  SOCIAL_APPLE = 'apple',
  SOCIAL_GOOGLE = 'google',
}

export enum EnumAuthScopeType {
  USER = 'user',
  CUSTOMER = 'customer',
  CLIENT = 'client',
}

export enum EnumAuthTwoFactorMethod {
  code = 'code',
  backupCodes = 'backupCodes',
}
