import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common'
import { APP_ENV_META_KEY } from '../constants'
import { ScopeContext } from '../contexts'
import { EnumAppEnvironment, EnumScopeType } from '../enums'
import { AppEnvGuard } from '../guards'
import { IScopeContextData } from '../interfaces'

export function AppEnvProtected(...envs: EnumAppEnvironment[]): MethodDecorator {
  return applyDecorators(UseGuards(AppEnvGuard), SetMetadata(APP_ENV_META_KEY, envs))
}
/**
 * Run the method in its own scope (log context; `query: false` also stops SQL query logging).
 * With `@Cron`, put `@OnScope` below it so the cron metadata lands on the wrapped method.
 */
export function OnScope(
  scope: EnumScopeType,
  options: { raw?: boolean; context: string; query?: boolean },
) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    const ctxData: IScopeContextData = {
      scopeType: scope,
      logger: {
        context: options?.raw === true ? options.context : `${scope}.${options.context}`,
        ...(options?.query === false && { query: false }),
      },
    }

    descriptor.value = function (...args: any[]) {
      return ScopeContext.create(ctxData, () => originalMethod.apply(this, args))
    }

    return descriptor
  }
}
