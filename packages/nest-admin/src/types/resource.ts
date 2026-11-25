import type { ComponentType } from 'react'

/**
 * Metadata model emitted by `scripts/generate-admin.mjs` into `src/generated/resources.ts` and
 * rendered at runtime by the generic list / detail / form pages.
 */

export type FieldType =
  | 'string'
  | 'text'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'date'
  | 'datetime'
  | 'file'
  | 'locale'
  | 'object'
  | 'array'

export type LocaleFormat = 'line' | 'text' | 'html'

export interface FieldMeta {
  /** Property (or query parameter) name. */
  name: string
  type: FieldType
  required?: boolean
  nullable?: boolean
  /** Help text taken from the swagger description (never an example value). */
  description?: string
  /** `enum`: allowed values of an inline enum (shared enums use `enumName`). */
  options?: string[]
  /** `enum`: name of the shared enum in `ENUMS` (src/generated/enums.ts). */
  enumName?: string
  /** `locale`: language codes. */
  languages?: string[]
  /** `locale`: editor flavour (single line, textarea, rich text). */
  localeFormat?: LocaleFormat
  /** `object`: nested fields. */
  fields?: FieldMeta[]
  /** `array`: element type. */
  itemType?: FieldType
  /** `array` of objects: element fields. */
  itemFields?: FieldMeta[]
  /** `array` of enums: allowed element values of an inline enum. */
  itemOptions?: string[]
  /** `array` of enums: name of the shared enum in `ENUMS`. */
  itemEnumName?: string
  /** Lookup endpoint (relative to the API base) that provides `{ id, name }` options. */
  lookup?: string
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface OperationMeta {
  method: HttpMethod
  /** Path template relative to the API base URL, e.g. `/roles/{id}`. */
  path: string
  /** Ability subject required by the operation (from `jwtAccessToken.user.abilities`). */
  subject?: string
  /** Ability action required by the operation (`read`, `create`, `update`, `delete`, ...). */
  action?: string
  /** Request body encoding, when the operation takes a body. */
  contentType?: 'json' | 'multipart'
  /** Request body fields, when the operation takes a body. */
  body?: FieldMeta[]
}

export interface ListOperationMeta extends OperationMeta {
  /** Fields of one row, as documented by swagger (the runtime merges in the keys it sees). */
  columns: FieldMeta[]
  /** Query filters (everything except paging, ordering and export parameters). */
  filters: FieldMeta[]
  paged: boolean
  sortable: boolean
  searchable: boolean
  exportable: boolean
}

export interface GetOperationMeta extends OperationMeta {
  fields: FieldMeta[]
}

export interface FormOperationMeta extends OperationMeta {
  contentType: 'json' | 'multipart'
  body: FieldMeta[]
  /** Optional GET template used to preload the create form (e.g. `/roles/new`). */
  template?: string
}

export interface ActionMeta extends OperationMeta {
  /** Last static path segment, e.g. `active`, `renew`, `change-avatar`. */
  name: string
}

export interface LookupMeta {
  path: string
  /** Query filters the lookup endpoint accepts. */
  filters: FieldMeta[]
}

export interface ChildListMeta {
  /** Stable key, e.g. `activity-logs-users`. */
  key: string
  /** Route key of the resource that owns the rows (used for labels). */
  resource: string
  method: 'GET'
  /** Path template, e.g. `/activity-logs/users/{userId}`. */
  path: string
  /** Name of the path parameter that receives the parent id. */
  param: string
  subject?: string
  action?: string
  columns: FieldMeta[]
  filters: FieldMeta[]
  paged: boolean
  sortable: boolean
  searchable: boolean
}

export interface ResourceMeta {
  /** Route key, kebab-case of the subject: `api-key`. Matches the policy `path`. */
  key: string
  /** Ability subject: `API_KEY`. */
  subject: string
  /** Collection path relative to the API base: `/api-keys`. */
  basePath: string
  list?: ListOperationMeta
  get?: GetOperationMeta
  create?: FormOperationMeta
  update?: FormOperationMeta
  delete?: OperationMeta
  actions: ActionMeta[]
  lookup?: LookupMeta
  children: ChildListMeta[]
}

export type CustomOverride = {
  list?: ComponentType<{ resource: ResourceMeta }>
  detail?: ComponentType<{ resource: ResourceMeta }>
  form?: ComponentType<{ resource: ResourceMeta; mode: 'create' | 'edit' }>
  /** Column keys never shown in list and detail. */
  hiddenColumns?: string[]
  /** Explicit list column order (replaces the automatic selection). */
  columns?: string[]
}
