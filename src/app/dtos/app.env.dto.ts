import { IsEnum, IsNotEmpty, IsString, IsUrl, ValidateIf } from 'class-validator'
import { EnumAppEnvironment } from 'lib/nest-core'

export class AppEnvDto {
  @IsString()
  @IsNotEmpty()
  APP_NAME: string

  @IsString()
  @IsNotEmpty()
  @IsEnum(EnumAppEnvironment)
  APP_ENV: EnumAppEnvironment

  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  APP_URL: string

  @IsString()
  @IsNotEmpty()
  APP_SECRET_KEY: string

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string

  // Redis / Valkey: used by the cache, and by the store behind x-nonce checks and rate limiting
  @IsString()
  @IsNotEmpty()
  CACHE_REDIS_URL: string

  // Required only when x-nonce / x-signature request security is enabled
  @ValidateIf((env: AppEnvDto) => env.REQUEST_SECURITY_ENABLED === 'true')
  @IsString()
  @IsNotEmpty()
  MIDDLEWARE_SECURITY_KEY?: string

  REQUEST_SECURITY_ENABLED?: string
}
