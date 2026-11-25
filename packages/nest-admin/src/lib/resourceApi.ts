import { _privateAxios } from './httpClient'
import { getLastMetadata, type ResponseMetadata } from './responseMetadata'
import type { FieldMeta, OperationMeta } from '../types/resource'

export type PathParams = Record<string, string | number>
export type Query = Record<string, string | number | boolean | undefined | null>

/** `/roles/{id}/active` + `{ id: 3 }` -> `/roles/3/active`. */
export function buildPath(template: string, params: PathParams = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    encodeURIComponent(String(params[name] ?? '')),
  )
}

export function cleanQuery(query: Query = {}): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  Object.entries(query).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    out[k] = v
  })
  return out
}

export type ListResult = { rows: Array<Record<string, any>>; meta: ResponseMetadata | null }

/** GET a list. Metadata is captured right after the call so concurrent requests cannot clobber it. */
export async function fetchList(path: string, query: Query = {}): Promise<ListResult> {
  const res = await _privateAxios.get(path, { params: cleanQuery(query) })
  const meta = getLastMetadata()
  return { rows: Array.isArray(res) ? res : [], meta }
}

export async function fetchOne<T = Record<string, any>>(
  template: string,
  params: PathParams = {},
): Promise<T> {
  return (await _privateAxios.get(buildPath(template, params))) as T
}

export type LookupOption = { value: string | number; label: string }

export async function fetchLookup(path: string): Promise<LookupOption[]> {
  const res = await _privateAxios.get(path)
  const rows: Array<Record<string, any>> = Array.isArray(res) ? res : []
  return rows
    .filter((r) => r && r.id !== undefined)
    .map((r) => ({
      value: r.id,
      label: String(r.name ?? r.title ?? r.email ?? r.code ?? `#${r.id}`),
    }))
}

/**
 * Multipart encoding: files stay files, booleans become 'true'/'false', numbers become strings,
 * nested objects / arrays are JSON strings; empty values are skipped.
 */
export function toFormData(values: Record<string, unknown>): FormData {
  const form = new FormData()
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (value instanceof File || value instanceof Blob) form.append(key, value)
    else if (typeof value === 'boolean') form.append(key, value ? 'true' : 'false')
    else if (typeof value === 'object') form.append(key, JSON.stringify(value))
    else form.append(key, String(value))
  })
  return form
}

export async function sendRequest(
  op: Pick<OperationMeta, 'method' | 'path' | 'contentType'>,
  params: PathParams = {},
  values?: Record<string, unknown>,
): Promise<unknown> {
  const url = buildPath(op.path, params)
  const method = op.method.toLowerCase() as 'post' | 'put' | 'patch' | 'delete' | 'get'
  if (method === 'get' || method === 'delete') return _privateAxios[method](url)
  const data = values && op.contentType === 'multipart' ? toFormData(values) : (values ?? undefined)
  return _privateAxios[method](url, data)
}

export type { FieldMeta }
