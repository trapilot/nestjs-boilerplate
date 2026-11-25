import type { FieldMeta } from '../types/resource'
import { isEmptyValue, isPlainObject } from './format'

export type FormValues = Record<string, any>

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toLocalInput(value: unknown, withTime: boolean): string {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return withTime ? `${day}T${pad(d.getHours())}:${pad(d.getMinutes())}` : day
}

function emptyValue(field: FieldMeta): unknown {
  switch (field.type) {
    case 'boolean':
      return false
    case 'array':
      return []
    case 'object':
      return field.fields ? initialValues(field.fields) : ''
    case 'locale':
      return Object.fromEntries((field.languages ?? []).map((l) => [l, '']))
    case 'file':
      return null
    default:
      return ''
  }
}

function fromServer(field: FieldMeta, value: unknown): unknown {
  if (value === undefined || value === null) return emptyValue(field)
  switch (field.type) {
    case 'datetime':
      return toLocalInput(value, true)
    case 'date':
      return toLocalInput(value, false)
    case 'number':
      return value
    case 'boolean':
      return value === true || value === 'true'
    case 'enum':
      return String(value)
    case 'locale': {
      const base = emptyValue(field) as Record<string, string>
      return isPlainObject(value) ? { ...base, ...(value as Record<string, string>) } : base
    }
    case 'object':
      if (field.fields) return initialValues(field.fields, value)
      return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
    case 'array': {
      const list = Array.isArray(value) ? value : []
      if (field.itemType === 'object' && field.itemFields) {
        return list.map((item) => initialValues(field.itemFields!, item))
      }
      return list
    }
    case 'file':
      return null
    default:
      return String(value)
  }
}

/** Form state for `fields`, seeded from a server record (detail / template) when given. */
export function initialValues(fields: FieldMeta[], data?: unknown): FormValues {
  const record = isPlainObject(data) ? data : {}
  const values: FormValues = {}
  fields.forEach((field) => {
    let raw = record[field.name]
    // `roleId` may only be present as a nested `role: { id }`.
    if (raw === undefined && field.lookup && field.name.endsWith('Id')) {
      const nested = record[field.name.slice(0, -2)]
      if (isPlainObject(nested)) raw = nested.id
    }
    values[field.name] = fromServer(field, raw)
  })
  return values
}

function isRequired(field: FieldMeta, mode: 'create' | 'edit'): boolean {
  if (!field.required || field.nullable) return false
  if (field.type === 'boolean') return false
  // The API accepts an omitted password on update even though swagger marks it required.
  if (mode === 'edit' && /password/i.test(field.name)) return false
  return true
}

function missing(field: FieldMeta, value: unknown): boolean {
  if (field.type === 'locale') {
    const v = isPlainObject(value) ? value : {}
    return (field.languages ?? Object.keys(v)).some((l) => isEmptyValue(v[l]))
  }
  if (field.type === 'file') return !(value instanceof File)
  return isEmptyValue(value)
}

/** Client-side required check. Returns `{ field: message }`. */
export function validate(
  fields: FieldMeta[],
  values: FormValues,
  mode: 'create' | 'edit',
  messages: { required: string; locales: string },
): Record<string, string> {
  const errors: Record<string, string> = {}
  fields.forEach((field) => {
    if (!isRequired(field, mode)) return
    if (missing(field, values[field.name])) {
      errors[field.name] = field.type === 'locale' ? messages.locales : messages.required
    }
  })
  return errors
}

function toServer(field: FieldMeta, value: unknown): unknown {
  switch (field.type) {
    case 'number':
      return value === '' || value === null || value === undefined ? undefined : Number(value)
    case 'boolean':
      return Boolean(value)
    case 'datetime': {
      if (!value) return undefined
      const d = new Date(String(value))
      return isNaN(d.getTime()) ? undefined : d.toISOString()
    }
    case 'date':
      return value ? String(value) : undefined
    case 'file':
      return value instanceof File ? value : undefined
    case 'locale':
      return value
    case 'object':
      if (field.fields) return buildBody(field.fields, (value ?? {}) as FormValues)
      if (typeof value === 'string' && value.trim()) {
        try {
          return JSON.parse(value)
        } catch {
          return undefined
        }
      }
      return undefined
    case 'array': {
      const list = Array.isArray(value) ? value : []
      if (field.itemType === 'object' && field.itemFields) {
        return list.map((item) => buildBody(field.itemFields!, item as FormValues))
      }
      if (field.itemType === 'number') return list.map(Number).filter((n) => !isNaN(n))
      return list
    }
    default:
      return typeof value === 'string' ? (value.trim() === '' ? undefined : value) : value
  }
}

/** Converts form state back to the request body, dropping empty optional values. */
export function buildBody(fields: FieldMeta[], values: FormValues): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  fields.forEach((field) => {
    const out = toServer(field, values[field.name])
    if (out !== undefined) body[field.name] = out
  })
  return body
}

/** Maps API field errors (`policies.0.subject`) onto their top-level form field. */
export function topLevelErrors(errors: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  Object.entries(errors).forEach(([key, message]) => {
    const root = key.split(/[.[]/)[0]
    out[root] ??= message
  })
  return out
}
