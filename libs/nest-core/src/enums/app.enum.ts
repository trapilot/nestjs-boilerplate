/* eslint-disable @typescript-eslint/no-duplicate-enum-values */
export enum EnumAppEnvironment {
  PRODUCTION = 'production',
  STABLE = 'stable',
  STAGING = 'staging',
  DEVELOPMENT = 'development',
}

export enum EnumAppLanguage {
  EN = 'en',
  VI = 'vi',
}

export enum EnumAppLocale {
  EN = 'en_US',
  VI = 'vi_VN',
}

export enum EnumAppTimezone {
  UTC = 'UTC',
  ASIA_HCM = 'Asia/Ho_Chi_Minh',
}

export enum EnumNumberLocale {
  EN = 'en-US',
  VI = 'vi-VN',
}

export enum EnumNumberCurrency {
  EN = 'USD',
  VI = 'VND',
  CN = 'CNY',
  HK = 'HKD',
  TW = 'TWD',
  MO = 'MOP',
}

export enum EnumScopeType {
  HTTP = 'http',
  CRON = 'cron',
  QUEUE = 'queue',
  COMMAND = 'command',
}

export enum EnumCommandType {
  up = 'up',
  down = 'down',
}

export enum EnumRouteType {
  PUB = 'pub',
  CMS = 'cms',
  APP = 'app',
  WEB = 'web',
}

export enum EnumRoutePath {
  PUB = '/',
  CMS = '/admin',
  APP = '/app',
  WEB = '/web',
}

export enum EnumUserType {
  UNKNOWN = 'unknown',
  MALE = 'make',
  FEMALE = 'female',
}

export enum EnumLoggerSeverity {
  CRITICAL = 'critical',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace',
}
