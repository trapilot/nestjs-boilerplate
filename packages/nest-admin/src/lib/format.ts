import { ENUMS } from '../generated/enums'
import type { FieldMeta } from '../types/resource'
import { getLanguage } from '../utils/language'
import { isValidDate } from '../utils/time'

/** `createdAt` -> "Created at", `change-avatar` -> "Change avatar", `API_KEY` -> "Api key". */
export function humanize(name: string): string {
  const spaced = name
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function titleCase(name: string): string {
  return humanize(name).replace(/\b[a-z]/g, (c) => c.toUpperCase())
}

export function enumOptions(field: Pick<FieldMeta, 'options' | 'enumName'>): string[] {
  return field.options ?? (field.enumName ? ENUMS[field.enumName] : undefined) ?? []
}

export function itemEnumOptions(field: Pick<FieldMeta, 'itemOptions' | 'itemEnumName'>): string[] {
  return field.itemOptions ?? (field.itemEnumName ? ENUMS[field.itemEnumName] : undefined) ?? []
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** `{ en: '...', vi: '...' }` style multi-language value. */
export function isLocaleValue(value: unknown): value is Record<string, string> {
  if (!isPlainObject(value)) return false
  const keys = Object.keys(value)
  return keys.length > 0 && keys.every((k) => /^[a-z]{2}$/.test(k) && typeof value[k] === 'string')
}

export function localized(value: Record<string, string>, lang = getLanguage()): string {
  return value[lang] || value.en || Object.values(value).find(Boolean) || ''
}

export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Short human text for a nested object (`name`, `title`, `email`, `code`, then `id`). */
export function displayName(value: unknown): string | undefined {
  if (!isPlainObject(value)) return undefined
  for (const key of ['name', 'title', 'email', 'code', 'label']) {
    const v = value[key]
    if (typeof v === 'string' && v) return v
    if (isLocaleValue(v)) return localized(v)
  }
  if (value.id !== undefined && value.id !== null) return `#${String(value.id)}`
  return undefined
}

/** Row title for headings: name/title/email, else `#id`. */
export function rowTitle(row: unknown, fallback: string): string {
  if (!isPlainObject(row)) return fallback
  for (const key of ['name', 'title', 'email', 'code', 'description']) {
    const v = row[key]
    if (typeof v === 'string' && v) return v
    if (isLocaleValue(v)) {
      const text = stripHtml(localized(v))
      if (text) return text
    }
  }
  return row.id !== undefined ? `${fallback} #${String(row.id)}` : fallback
}

export function formatDate(value: unknown, withTime = true): string {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  const [valid, date] = isValidDate(String(value))
  if (!valid) return String(value)
  try {
    return new Intl.DateTimeFormat(getLanguage(), {
      dateStyle: 'medium',
      ...(withTime ? { timeStyle: 'short' } : {}),
    }).format(date)
  } catch {
    return date.toISOString()
  }
}

const DATE_ONLY_KEYS = /(birth|dob)/i

export function isDateKey(key: string): boolean {
  return /(At|Date)$/.test(key) || /^(date|time)$/i.test(key)
}

export function isDateOnlyKey(key: string): boolean {
  return DATE_ONLY_KEYS.test(key)
}

export function isImageKey(key: string): boolean {
  return /(avatar|image|thumbnail|photo|logo|picture)/i.test(key)
}

export function isUrlValue(value: unknown): value is string {
  return typeof value === 'string' && /^(https?:\/\/|\/)\S+$/.test(value)
}

export function isEmptyValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0)
  )
}
