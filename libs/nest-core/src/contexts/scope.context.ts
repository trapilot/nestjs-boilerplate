import { AsyncLocalStorage } from 'async_hooks'
import { APP_LANGUAGE, APP_TIMEZONE } from '../constants'
import { EnumRouteType, EnumScopeType } from '../enums'
import { IScopeContextData } from '../interfaces'

export class ScopeContext {
  private static readonly storage = new AsyncLocalStorage<IScopeContextData>()

  static create<T>(
    data: IScopeContextData,
    next: (...args: any[]) => T | Promise<T>,
  ): T | Promise<T> {
    const existing = this.current()
    if (existing) {
      return next()
    }
    return this.storage.run(data, next)
  }

  static current(): IScopeContextData | undefined {
    return this.storage.getStore()
  }

  static currentOrThrow(): IScopeContextData {
    const ctx = this.storage.getStore()
    if (!ctx) throw new Error(`Context does not initialize`)
    return ctx
  }

  static get<T extends keyof IScopeContextData>(
    key: T,
    def?: IScopeContextData[T],
  ): IScopeContextData[T] | undefined {
    const ctx = this.current()
    return ctx?.[key] ?? def
  }

  /** Value from the per-request store; undefined outside an HTTP request. */
  static getStoreValue<T>(key: string): T | undefined {
    return this.current()?.store?.get(key) as T | undefined
  }

  /** Sets a per-request store value; returns false when there is no request store. */
  static setStoreValue<T>(key: string, value: T): boolean {
    const store = this.current()?.store
    if (!store) {
      return false
    }
    store.set(key, value)
    return true
  }

  /**
   * Request data of the current HTTP context. Falls back to app defaults when there is none
   * (e.g. a request that never passed the context middleware), so error paths that build
   * response metadata can never throw and crash the process.
   */
  static getReqData(): IScopeContextData['http'] {
    return (
      this.current()?.http ?? {
        route: '',
        version: '',
        language: APP_LANGUAGE,
        timezone: APP_TIMEZONE,
        tenantId: '',
      }
    )
  }

  static getReqZone(defValue: string = APP_TIMEZONE): string {
    try {
      const { timezone } = this.getReqData()
      return timezone
    } catch {}
    return defValue
  }

  static getReqLang(defValue: string = APP_LANGUAGE): string {
    try {
      const { language } = this.getReqData()
      return language
    } catch {}
    return defValue
  }

  static isReqRoute(routeType: EnumRouteType): boolean {
    try {
      const { route } = this.getReqData()
      return route === routeType
    } catch {}
    return false
  }

  static isReq(): boolean {
    const ctx = this.current()
    return ctx && ctx.scopeType == EnumScopeType.HTTP
  }
}
