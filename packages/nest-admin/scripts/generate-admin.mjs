/**
 * Builds the admin metadata registry from swagger.json.
 *
 * Output (src/generated is deleted and recreated on every run):
 *   - src/generated/resources.ts : RESOURCES (one ResourceMeta per ability subject)
 *   - src/generated/enums.ts     : string-literal union types + ENUMS record
 *
 * Operations are classified by HTTP method + path shape, never by operationId.
 * Swagger `example` / `default` values are never copied (they can hold real seed data).
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.cwd())
const INPUT = path.join(ROOT, 'swagger.json')
const OUT_DIR = path.join(ROOT, 'src', 'generated')
const API_PREFIX = '/api/admin'
const PAGING_PARAMS = new Set(['page', 'perPage', 'orderBy', 'bookType', 'search'])
const LOCALE_SCHEMAS = new Set([
  'ResponseLocaleDto',
  'RequestSentenceDto',
  'RequestParagraphDto',
  'RequestContentDto',
])

const spec = JSON.parse(fs.readFileSync(INPUT, 'utf-8'))
const schemas = spec.components?.schemas ?? {}

// ---------------------------------------------------------------------------------------------
// Schema helpers
// ---------------------------------------------------------------------------------------------

const refName = (ref) => (typeof ref === 'string' ? ref.split('/').pop() : undefined)

/** Follows `$ref` and single-item `allOf`, keeping the outer description / nullable. */
function resolve(schema, seen = new Set()) {
  if (!schema || typeof schema !== 'object') return { schema: {}, name: undefined }
  let name
  let current = schema
  let description = schema.description
  let nullable = schema.nullable
  for (let i = 0; i < 10; i++) {
    if (current.$ref) {
      name = refName(current.$ref)
      if (seen.has(name)) break
      seen.add(name)
      current = schemas[name] ?? {}
      description = description ?? current.description
      nullable = nullable ?? current.nullable
      continue
    }
    if (!current.type && !current.properties && Array.isArray(current.allOf) && current.allOf[0]) {
      const outer = current
      current = current.allOf[0]
      description = description ?? outer.description
      nullable = nullable ?? outer.nullable
      continue
    }
    if (!current.type && Array.isArray(current.oneOf) && current.oneOf[0]) {
      const outer = current
      current = current.oneOf.find((s) => s.type !== 'null') ?? current.oneOf[0]
      description = description ?? outer.description
      nullable = nullable ?? outer.nullable
      continue
    }
    break
  }
  return { schema: current, name, description, nullable }
}

const isSharedEnum = (name) =>
  name.startsWith('Enum') && schemas[name]?.type === 'string' && Array.isArray(schemas[name]?.enum)

const LOCALE_CODES = /^[a-z]{2}$/

function isLocaleObject(name, schema) {
  if (name && LOCALE_SCHEMAS.has(name)) return true
  const keys = Object.keys(schema.properties ?? {})
  return schema.type === 'object' && keys.length > 0 && keys.every((k) => LOCALE_CODES.test(k))
}

function localeFormat(name, fieldName) {
  if (name === 'RequestContentDto') return 'html'
  if (name === 'RequestParagraphDto') return 'text'
  // The backend documents some rich-text fields (e.g. static page content) as sentences.
  if (fieldName === 'content' || fieldName === 'body' || fieldName === 'html') return 'html'
  return 'line'
}

function isBooleanEnum(options) {
  return options.length === 2 && options.includes('true') && options.includes('false')
}

/** Converts a schema property to a FieldMeta. */
function toField(fieldName, rawSchema, requiredSet, lookups, depth = 0) {
  const { schema, name: ref, description, nullable } = resolve(rawSchema)
  const field = { name: fieldName, type: 'string' }
  if (requiredSet?.has(fieldName)) field.required = true
  if (nullable) field.nullable = true
  if (description) field.description = description

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    const options = schema.enum.map(String)
    if (isBooleanEnum(options)) {
      field.type = 'boolean'
    } else {
      field.type = 'enum'
      // Shared enums are resolved at runtime from ENUMS; only inline enums carry their options.
      if (ref && isSharedEnum(ref)) field.enumName = ref
      else field.options = options
    }
    return field
  }

  switch (schema.type) {
    case 'boolean':
      field.type = 'boolean'
      break
    case 'number':
    case 'integer':
      field.type = 'number'
      break
    case 'array': {
      field.type = 'array'
      const item = resolve(schema.items)
      if (Array.isArray(item.schema.enum)) {
        field.itemType = 'enum'
        if (item.name && isSharedEnum(item.name)) field.itemEnumName = item.name
        else field.itemOptions = item.schema.enum.map(String)
      } else if (item.schema.type === 'object' || item.schema.properties) {
        if (isLocaleObject(item.name, item.schema)) {
          field.itemType = 'locale'
        } else {
          field.itemType = 'object'
          if (depth < 4) field.itemFields = toFields(item.schema, lookups, depth + 1)
        }
      } else if (item.schema.type === 'number' || item.schema.type === 'integer') {
        field.itemType = 'number'
      } else if (item.schema.type === 'boolean') {
        field.itemType = 'boolean'
      } else {
        field.itemType = 'string'
      }
      break
    }
    case 'object':
    default:
      if (schema.type === 'object' || schema.properties) {
        if (isLocaleObject(ref, schema)) {
          field.type = 'locale'
          field.languages = Object.keys(schema.properties ?? {})
          field.localeFormat = localeFormat(ref, fieldName)
        } else {
          field.type = 'object'
          if (schema.properties && depth < 4) field.fields = toFields(schema, lookups, depth + 1)
        }
      } else if (schema.format === 'binary') {
        field.type = 'file'
      } else if (schema.format === 'date-time') {
        field.type = 'datetime'
      } else if (schema.format === 'date') {
        field.type = 'date'
      } else {
        field.type = 'string'
      }
  }

  if (schema.format === 'binary') field.type = 'file'
  else if (schema.format === 'date-time' && field.type === 'string') field.type = 'datetime'
  else if (schema.format === 'date' && field.type === 'string') field.type = 'date'

  if (lookups && lookups[fieldName] && (field.type === 'number' || field.type === 'string')) {
    field.lookup = lookups[fieldName]
  }
  return field
}

function toFields(schema, lookups, depth = 0) {
  const { schema: obj } = resolve(schema)
  const required = new Set(obj.required ?? [])
  return Object.entries(obj.properties ?? {}).map(([name, prop]) =>
    toField(name, prop, required, lookups, depth),
  )
}

/** Query parameter -> filter FieldMeta. */
function toFilter(param, lookups) {
  const field = toField(param.name, param.schema ?? {}, undefined, lookups)
  delete field.required
  delete field.nullable
  if (param.description && !field.description) field.description = param.description
  // Filters are flat: nothing but scalar, enum, boolean or lookup controls.
  if (!['string', 'number', 'boolean', 'enum', 'date', 'datetime'].includes(field.type)) return null
  if (field.type === 'string' && !field.lookup && !param.schema) return null
  return field
}

// ---------------------------------------------------------------------------------------------
// Naming helpers
// ---------------------------------------------------------------------------------------------

const isParam = (s) => /^\{.+\}$/.test(s)
const paramName = (s) => s.slice(1, -1)

function singular(word) {
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y'
  if (word.endsWith('s')) return word.slice(0, -1)
  return word
}

function camel(kebab) {
  return kebab.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
}

const keyOf = (subject) => subject.toLowerCase().replace(/_/g, '-')

// ---------------------------------------------------------------------------------------------
// Operation scanning
// ---------------------------------------------------------------------------------------------

function abilityOf(op) {
  const abilities = op?.jwtAccessToken?.user?.abilities
  if (!Array.isArray(abilities) || abilities.length === 0) return {}
  const first = abilities[0]
  const actions = Array.isArray(first.actions) ? first.actions : []
  return { subject: first.subject, action: actions.find((a) => a !== 'read') ?? actions[0] }
}

function successSchema(op) {
  const res = op.responses?.['200'] ?? op.responses?.['201']
  return res?.content?.['application/json']?.schema
}

/** Returns the row schema when the response is `{ data: [ ... ] }`. */
function listItemSchema(op) {
  const schema = successSchema(op)
  const data = schema?.properties?.data
  if (data?.type === 'array' && data.items) return data.items
  return null
}

/** Returns the object schema when the response is `{ data: <object> }`. */
function dataSchema(op) {
  const schema = successSchema(op)
  const data = schema?.properties?.data
  if (data && data.type !== 'array') return data
  return null
}

function bodyOf(op, lookups) {
  const content = op.requestBody?.content
  if (!content) return null
  const multipart = content['multipart/form-data']
  const json = content['application/json'] ?? content['application/x-www-form-urlencoded']
  const picked = multipart && !json ? multipart : (json ?? multipart)
  if (!picked?.schema) return null
  return {
    contentType: multipart && !json ? 'multipart' : 'json',
    body: toFields(picked.schema, lookups),
  }
}

function queryParams(op) {
  return (op.parameters ?? []).filter((p) => p.in === 'query')
}

function collectOperations() {
  const operations = []
  for (const [rawPath, item] of Object.entries(spec.paths ?? {})) {
    if (!rawPath.startsWith(API_PREFIX + '/')) continue
    const relative = rawPath.slice(API_PREFIX.length)
    for (const [method, op] of Object.entries(item)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue
      operations.push({
        method: method.toUpperCase(),
        path: relative,
        op,
        segments: relative.split('/').filter(Boolean),
      })
    }
  }
  return operations
}

// ---------------------------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------------------------

function build() {
  const operations = collectOperations()
  const skipped = []

  // 1. group by first path segment
  const groups = new Map()
  for (const entry of operations) {
    const base = entry.segments[0]
    if (!groups.has(base)) groups.set(base, [])
    groups.get(base).push(entry)
  }

  // 2. lookups: `<singular>Id` -> `/<plural>/map-shorted`
  const lookups = {}
  const lookupOps = new Map()
  for (const [base, entries] of groups) {
    const found = entries.find(
      (e) => e.method === 'GET' && e.segments.length === 2 && e.segments[1] === 'map-shorted',
    )
    if (!found) continue
    lookups[`${camel(singular(base))}Id`] = found.path
    lookupOps.set(base, found)
  }

  // 3. classify operations of each group
  const parsed = []
  for (const [base, entries] of groups) {
    const group = {
      base,
      basePath: '/' + base,
      list: null,
      alt: null,
      get: null,
      create: null,
      update: null,
      delete: null,
      template: null,
      lookup: lookupOps.get(base) ?? null,
      actions: [],
      children: [],
      used: new Set(),
    }
    for (const entry of entries) {
      const { method, segments, op } = entry
      const rest = segments.slice(1)
      const label = `${method} ${entry.path}`
      if (rest.length === 0) {
        if (method === 'GET' && listItemSchema(op)) group.list = entry
        else if (method === 'POST') group.create = entry
        else skipped.push(label)
      } else if (rest.length === 1 && isParam(rest[0])) {
        if (method === 'GET') group.get = entry
        else if (method === 'PUT' || method === 'PATCH') group.update = entry
        else if (method === 'DELETE') group.delete = entry
        else skipped.push(label)
      } else if (rest.length === 1 && method === 'GET' && rest[0] === 'map-shorted') {
        // lookup, handled above
      } else if (rest.length === 1 && method === 'GET' && rest[0] === 'new') {
        group.template = entry
      } else if (
        rest.length === 1 &&
        method === 'GET' &&
        (rest[0] === '_me' || rest[0] === 'me') &&
        listItemSchema(op)
      ) {
        group.alt = entry
      } else if (
        rest.length === 2 &&
        isParam(rest[0]) &&
        !isParam(rest[1]) &&
        ['PUT', 'PATCH', 'POST'].includes(method)
      ) {
        group.actions.push({ ...entry, name: rest[1] })
      } else if (
        rest.length === 2 &&
        method === 'GET' &&
        !isParam(rest[0]) &&
        isParam(rest[1]) &&
        listItemSchema(op)
      ) {
        group.children.push({ ...entry, parentPlural: rest[0], param: paramName(rest[1]) })
      } else {
        skipped.push(label)
      }
    }
    if (!group.list && group.alt) {
      group.list = group.alt
      group.alt = null
    }
    parsed.push(group)
  }

  // 4. subjects and resources
  const resources = []
  for (const group of parsed) {
    const ordered = [
      group.list,
      group.get,
      group.create,
      group.update,
      group.delete,
      ...group.actions,
      ...group.children,
    ].filter(Boolean)
    const subject = ordered.map((e) => abilityOf(e.op).subject).find(Boolean)
    const hasCrud = group.list || group.get || group.create
    if (!subject || !hasCrud) {
      for (const e of [...ordered, group.template, group.lookup].filter(Boolean)) {
        skipped.push(`${e.method} ${e.path}`)
      }
      group.skipped = true
      continue
    }
    group.subject = subject
    group.key = keyOf(subject)
  }

  const byBase = new Map(parsed.filter((g) => !g.skipped).map((g) => [g.base, g]))

  for (const group of parsed) {
    if (group.skipped) continue
    const resource = {
      key: group.key,
      subject: group.subject,
      basePath: group.basePath,
      actions: [],
      children: [],
    }
    const opMeta = (entry) => {
      const ability = abilityOf(entry.op)
      const meta = { method: entry.method, path: entry.path }
      if (ability.subject) meta.subject = ability.subject
      if (ability.action) meta.action = ability.action
      return meta
    }

    if (group.list) {
      const row = listItemSchema(group.list.op)
      const params = queryParams(group.list.op)
      const filters = params
        .filter((p) => !PAGING_PARAMS.has(p.name))
        .map((p) => toFilter(p, lookups))
        .filter(Boolean)
      const opFlags = group.list.op
      resource.list = {
        ...opMeta(group.list),
        columns: toFields(row, lookups),
        filters,
        paged: opFlags.paging === true,
        sortable: opFlags.sortable === true,
        searchable: opFlags.searchable === true,
        exportable: opFlags.exportable === true,
      }
    }
    if (group.get) {
      const data = dataSchema(group.get.op)
      resource.get = { ...opMeta(group.get), fields: data ? toFields(data, lookups) : [] }
    }
    for (const kind of ['create', 'update']) {
      const entry = group[kind]
      if (!entry) continue
      const body = bodyOf(entry.op, lookups)
      const meta = {
        ...opMeta(entry),
        contentType: body?.contentType ?? 'json',
        body: body?.body ?? [],
      }
      if (kind === 'create' && group.template) meta.template = group.template.path
      resource[kind] = meta
    }
    if (group.delete) resource.delete = opMeta(group.delete)

    resource.actions = group.actions
      .map((entry) => {
        const body = bodyOf(entry.op, lookups)
        const meta = { ...opMeta(entry), name: entry.name }
        if (body) {
          meta.contentType = body.contentType
          meta.body = body.body
        }
        return meta
      })
      .sort((a, b) => a.name.localeCompare(b.name) || a.method.localeCompare(b.method))

    if (group.lookup) {
      resource.lookup = {
        path: group.lookup.path,
        filters: queryParams(group.lookup.op)
          .filter((p) => !PAGING_PARAMS.has(p.name))
          .map((p) => toFilter(p, lookups))
          .filter(Boolean)
          .filter((f) => f.type !== 'object'),
      }
    }

    // children are attached to the parent resource below
    resource._children = group.children
    resources.push({ group, resource })
  }

  for (const { group, resource } of resources) {
    for (const child of group.children) {
      const parent = byBase.get(child.parentPlural)
      const target = resources.find((r) => r.group === parent)
      if (!target) {
        skipped.push(`${child.method} ${child.path}`)
        continue
      }
      const ability = abilityOf(child.op)
      const row = listItemSchema(child.op)
      const filters = queryParams(child.op)
        .filter((p) => !PAGING_PARAMS.has(p.name) && p.name !== child.param)
        .map((p) => toFilter(p, lookups))
        .filter(Boolean)
      const meta = {
        key: `${group.base}-${child.parentPlural}`,
        resource: resource.key,
        method: 'GET',
        path: child.path,
        param: child.param,
      }
      if (ability.subject) meta.subject = ability.subject
      if (ability.action) meta.action = ability.action
      meta.columns = toFields(row, lookups)
      meta.filters = filters
      meta.paged = child.op.paging === true
      meta.sortable = child.op.sortable === true
      meta.searchable = child.op.searchable === true
      target.resource.children.push(meta)
    }
  }

  const list = resources.map((r) => {
    delete r.resource._children
    r.resource.children.sort((a, b) => a.key.localeCompare(b.key))
    return r.resource
  })
  list.sort((a, b) => a.subject.localeCompare(b.subject))
  return { resources: list, skipped: [...new Set(skipped)].sort() }
}

// ---------------------------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------------------------

function collectEnums() {
  const enums = {}
  for (const [name, schema] of Object.entries(schemas)) {
    if (!name.startsWith('Enum')) continue
    if (schema.type !== 'string' || !Array.isArray(schema.enum)) continue
    enums[name] = schema.enum.map(String)
  }
  // Ability subjects are documented inline on the role policy body.
  const subjects = schemas.RolePolicyRequestCreateDto?.properties?.subject?.enum
  if (Array.isArray(subjects) && !enums.EnumAuthAbilitySubject) {
    enums.EnumAuthAbilitySubject = subjects.map(String)
  }
  return Object.fromEntries(Object.entries(enums).sort(([a], [b]) => a.localeCompare(b)))
}

function renderEnums(enums) {
  const lines = [
    '/* AUTO-GENERATED by scripts/generate-admin.mjs from swagger.json. DO NOT EDIT. */',
    '',
  ]
  for (const [name, values] of Object.entries(enums)) {
    lines.push(`export type ${name} =`)
    for (const v of values) lines.push(`  | ${JSON.stringify(v).replace(/"/g, "'")}`)
    lines.push('')
  }
  lines.push('export const ENUMS: Record<string, string[]> = {')
  for (const [name, values] of Object.entries(enums)) {
    lines.push(`  ${name}: [${values.map((v) => `'${v}'`).join(', ')}],`)
  }
  lines.push('}', '')
  return lines.join('\n')
}

// ---------------------------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------------------------

/** Pretty-prints a JSON-like value as TypeScript (single quotes, no quoted keys, 2 spaces). */
function toTs(value, indent = 0) {
  const pad = '  '.repeat(indent)
  const padIn = '  '.repeat(indent + 1)
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    if (value.every((v) => typeof v === 'string' || typeof v === 'number')) {
      const inline = `[${value.map((v) => toTs(v)).join(', ')}]`
      if (inline.length + pad.length < 90) return inline
    }
    return `[\n${value.map((v) => padIn + toTs(v, indent + 1)).join(',\n')},\n${pad}]`
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined)
    if (entries.length === 0) return '{}'
    const body = entries.map(([k, v]) => {
      const key = /^[A-Za-z_$][\w$]*$/.test(k) ? k : `'${k}'`
      return `${padIn}${key}: ${toTs(v, indent + 1)}`
    })
    return `{\n${body.join(',\n')},\n${pad}}`
  }
  if (typeof value === 'string') {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n')}'`
  }
  return String(value)
}

function renderResources(resources) {
  return [
    '/* AUTO-GENERATED by scripts/generate-admin.mjs from swagger.json. DO NOT EDIT. */',
    "import type { ResourceMeta } from '../types/resource'",
    '',
    `export const RESOURCES: ResourceMeta[] = ${toTs(resources)}`,
    '',
  ].join('\n')
}

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------

const { resources, skipped } = build()
const enums = collectEnums()

fs.rmSync(OUT_DIR, { recursive: true, force: true })
fs.mkdirSync(OUT_DIR, { recursive: true })
fs.writeFileSync(path.join(OUT_DIR, 'resources.ts'), renderResources(resources), 'utf-8')
fs.writeFileSync(path.join(OUT_DIR, 'enums.ts'), renderEnums(enums), 'utf-8')

console.log(
  `Generated ${resources.length} resources, ${Object.keys(enums).length} enums -> src/generated`,
)
for (const r of resources) {
  const ops = []
  if (r.list) ops.push(`list${/\/_?me$/.test(r.list.path) ? '(me)' : ''}`)
  if (r.get) ops.push('get')
  if (r.create)
    ops.push(
      `create${r.create.contentType === 'multipart' ? '(multipart)' : ''}${r.create.template ? '+template' : ''}`,
    )
  if (r.update) ops.push('update')
  if (r.delete) ops.push('delete')
  if (r.actions.length) ops.push(`actions[${r.actions.map((a) => a.name).join(',')}]`)
  if (r.lookup) ops.push('lookup')
  if (r.children.length) ops.push(`children[${r.children.map((c) => c.path).join(', ')}]`)
  console.log(`  ${r.key.padEnd(14)} ${r.subject.padEnd(14)} ${ops.join(' ')}`)
}
console.log(`Skipped ${skipped.length} operations:`)
for (const s of skipped) console.log(`  - ${s}`)
