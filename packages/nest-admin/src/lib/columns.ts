import type { FieldMeta } from '../types/resource'
import {
  displayName,
  isDateKey,
  isLocaleValue,
  isPlainObject,
  localized,
  stripHtml,
} from './format'

export type ColumnDef = { key: string; field?: FieldMeta }

export const MAX_DEFAULT_COLUMNS = 8

const HIDDEN_NAMES = new Set(['createdBy', 'updatedBy', 'deletedBy', 'assignedBy', 'deletedAt'])
const HIDDEN_PATTERNS = [/^password/i, /hash$/i, /token$/i, /secret$/i]
const BLOB_NAMES = new Set([
  'metadata',
  'userAgent',
  'content',
  'body',
  'html',
  'payload',
  'pushes',
  'policies',
])
const NAME_LIKE = ['name', 'title', 'email', 'phone', 'type', 'code', 'key', 'action', 'username']

/** Keys that never make sense to show (audit ids, secrets, hashes). */
export function isHiddenKey(key: string): boolean {
  return HIDDEN_NAMES.has(key) || HIDDEN_PATTERNS.some((p) => p.test(key))
}

function samples(rows: Array<Record<string, unknown>>, key: string): unknown[] {
  return rows.map((r) => r?.[key]).filter((v) => v !== undefined && v !== null)
}

/** True when sampled values would wreck a table cell (long text, arrays, opaque objects). */
function isBlob(key: string, field: FieldMeta | undefined, values: unknown[]): boolean {
  if (BLOB_NAMES.has(key)) return true
  if (field?.type === 'locale' && field.localeFormat === 'html') return true
  return values.some((v) => {
    if (Array.isArray(v)) return true
    if (typeof v === 'string') return v.length > 150
    if (isLocaleValue(v)) return stripHtml(localized(v)).length > 150
    if (isPlainObject(v)) return displayName(v) === undefined
    return false
  })
}

function rank(key: string, field: FieldMeta | undefined, values: unknown[]): number {
  if (key === 'id') return 0
  const nameIdx = NAME_LIKE.indexOf(key)
  if (nameIdx >= 0) return 1 + nameIdx / 100
  if (field?.type === 'date' || field?.type === 'datetime' || isDateKey(key)) return 9
  const sample = values[0]
  if (isPlainObject(sample) && !isLocaleValue(sample)) return 7
  if (
    field?.type === 'boolean' ||
    typeof sample === 'boolean' ||
    /^(is|has)[A-Z]|status/i.test(key)
  )
    return 6
  return 3
}

/**
 * Candidate columns = swagger row fields merged with keys seen in the data, minus hidden keys
 * and blobs, ordered: id, name-like, plain, flags, nested objects, dates.
 */
export function buildColumns(
  fields: FieldMeta[],
  rows: Array<Record<string, unknown>>,
  hidden: string[] = [],
): ColumnDef[] {
  const sample = rows.slice(0, 20)
  const byKey = new Map<string, FieldMeta | undefined>()
  fields.forEach((f) => byKey.set(f.name, f))
  sample.forEach((row) => {
    if (!isPlainObject(row)) return
    Object.keys(row).forEach((k) => {
      if (!byKey.has(k)) byKey.set(k, undefined)
    })
  })

  const hide = new Set(hidden)
  const entries = [...byKey.entries()]
    .filter(([key]) => !isHiddenKey(key) && !hide.has(key))
    .map(([key, field], index) => {
      const values = samples(sample, key)
      return { key, field, index, values }
    })
    .filter((e) => !isBlob(e.key, e.field, e.values))

  entries.sort((a, b) => {
    const diff = rank(a.key, a.field, a.values) - rank(b.key, b.field, b.values)
    return diff !== 0 ? diff : a.index - b.index
  })
  return entries.map(({ key, field }) => ({ key, field }))
}

export function defaultVisibleKeys(columns: ColumnDef[], explicit?: string[]): string[] {
  const keys = columns.map((c) => c.key)
  if (explicit && explicit.length > 0) return explicit.filter((k) => keys.includes(k))
  return keys.slice(0, MAX_DEFAULT_COLUMNS)
}
