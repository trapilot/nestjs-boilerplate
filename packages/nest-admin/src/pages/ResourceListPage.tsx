import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Card,
  Checkbox,
  Dropdown,
  EmptyState,
  ErrorAlert,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  Pagination,
  SearchInput,
  Select,
  Input,
  TableSkeleton,
} from '../components/ui'
import { DataGrid, type SortState } from '../components/resource/DataGrid'
import { LookupSelect } from '../components/resource/FieldInput'
import { useActionRunner } from '../components/resource/useActionRunner'
import { PageHeader } from '../components/PageHeader'
import { useTableQuery } from '../hooks/useTableQuery'
import { useCan } from '../hooks/useCan'
import { buildColumns, defaultVisibleKeys } from '../lib/columns'
import { enumOptions, humanize } from '../lib/format'
import { useLabels, pluralName, singularName } from '../lib/labels'
import { fetchList } from '../lib/resourceApi'
import { readJson, writeJson } from '../lib/storage'
import { OVERRIDES } from '../overrides'
import type { FieldMeta, ResourceMeta } from '../types/resource'

function parseSort(value: string | null): SortState {
  if (!value) return null
  const [key, dir] = value.split(':')
  return key ? { key, dir: dir === 'desc' ? 'desc' : 'asc' } : null
}

export function FilterControl({
  field,
  value,
  onChange,
  label,
}: {
  field: FieldMeta
  value: string
  onChange: (value: string) => void
  label: string
}) {
  const { t } = useTranslation('common')
  const all = `${label}: ${t('all', { defaultValue: 'All' })}`
  if (field.lookup) {
    return (
      <LookupSelect small path={field.lookup} value={value} onChange={onChange} allLabel={all} />
    )
  }
  if (field.type === 'boolean') {
    return (
      <Select small aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{all}</option>
        <option value="true">{t('yes', { defaultValue: 'Yes' })}</option>
        <option value="false">{t('no', { defaultValue: 'No' })}</option>
      </Select>
    )
  }
  if (field.type === 'enum') {
    return (
      <Select small aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{all}</option>
        {enumOptions(field).map((o) => (
          <option key={o} value={o}>
            {humanize(o)}
          </option>
        ))}
      </Select>
    )
  }
  return (
    <Input
      small
      aria-label={label}
      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
      placeholder={label}
      defaultValue={value}
      key={value}
      onBlur={(e) => e.target.value !== value && onChange(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onChange((e.target as HTMLInputElement).value)}
    />
  )
}

export default function ResourceListPage({ resource }: { resource: ResourceMeta }) {
  const list = resource.list!
  const navigate = useNavigate()
  const { t } = useTranslation('common')
  const can = useCan()
  const labels = useLabels(resource.key)
  const override = OVERRIDES[resource.key]
  const [params, setParams] = useSearchParams()
  const { query } = useTableQuery({ page: 1, perPage: 20 })
  const sort = parseSort(params.get('orderBy'))
  const filterValues = Object.fromEntries(
    list.filters.map((f) => [f.name, params.get(f.name) ?? '']),
  )
  const activeFilters = Object.values(filterValues).some(Boolean)

  const patch = (next: Record<string, string | number | undefined>, keepPage = false) => {
    const copy = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => {
      if (v === undefined || v === '' || (k === 'page' && Number(v) <= 1)) copy.delete(k)
      else copy.set(k, String(v))
    })
    if (!keepPage && !('page' in next)) copy.delete('page')
    setParams(copy, { replace: true })
  }

  const requestQuery = {
    ...(list.paged ? { page: query.page, perPage: query.perPage } : {}),
    search: query.search,
    ...(list.sortable ? { orderBy: sort ? `${sort.key}:${sort.dir}` : undefined } : {}),
    ...filterValues,
  }

  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['list', resource.key, requestQuery],
    queryFn: () => fetchList(list.path, requestQuery),
    placeholderData: keepPreviousData,
  })

  const rows = data?.rows ?? []
  const meta = data?.meta ?? null
  const storageKey = `admin.columns.${resource.key}`

  const candidates = useMemo(
    () => buildColumns(list.columns, rows, override?.hiddenColumns),
    [list.columns, rows, override?.hiddenColumns],
  )
  const [chosen, setChosen] = useState<string[] | null>(() =>
    readJson<string[] | null>(storageKey, null),
  )
  useEffect(() => setChosen(readJson<string[] | null>(storageKey, null)), [storageKey])

  const visibleKeys = chosen
    ? candidates.filter((c) => chosen.includes(c.key)).map((c) => c.key)
    : defaultVisibleKeys(candidates, override?.columns)
  const visible = candidates.filter((c) => visibleKeys.includes(c.key))

  const toggleColumn = (key: string) => {
    const next = visibleKeys.includes(key)
      ? visibleKeys.filter((k) => k !== key)
      : [...visibleKeys, key]
    if (next.length === 0) return
    setChosen(next)
    writeJson(storageKey, next)
  }

  const [search, setSearch] = useState(query.search)
  useEffect(() => setSearch(query.search), [query.search])

  const runner = useActionRunner(resource)
  const canView = !!resource.get && runner.allowed(resource.get)
  const canEdit = !!resource.update && runner.allowed(resource.update)
  const canCreate =
    !!resource.create &&
    can(resource.create.subject ?? resource.subject, resource.create.action ?? 'create')

  const sortable = list.sortable ? (meta?.availableOrderBy ?? []) : []
  const onSort = (key: string) => {
    if (sort?.key !== key) patch({ orderBy: `${key}:asc` })
    else if (sort.dir === 'asc') patch({ orderBy: `${key}:desc` })
    else patch({ orderBy: undefined })
  }

  const title = labels.title(pluralName(resource.basePath))
  const pagination = meta?.pagination
  const total = list.paged ? (pagination?.totalRecord ?? rows.length) : rows.length

  const CustomList = override?.list
  if (CustomList) return <CustomList resource={resource} />

  const rowActions = (row: Record<string, any>) => {
    const actions = runner.visibleActions(row)
    const hasAny = canView || canEdit || actions.length > 0 || runner.canDelete
    if (!hasAny) return null
    return (
      <Dropdown
        trigger={({ toggle }) => (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            icon="more-vertical"
            aria-label={t('actions', { defaultValue: 'Actions' })}
            onClick={toggle}
          />
        )}
      >
        {(close) => (
          <>
            {canView ? (
              <MenuItem
                icon="eye"
                onClick={() => (close(), navigate(`/${resource.key}/${row.id}`))}
              >
                {t('view', { defaultValue: 'View' })}
              </MenuItem>
            ) : null}
            {canEdit ? (
              <MenuItem
                icon="pencil"
                onClick={() => (close(), navigate(`/${resource.key}/${row.id}/edit`))}
              >
                {t('edit', { defaultValue: 'Edit' })}
              </MenuItem>
            ) : null}
            {actions.length > 0 && (canView || canEdit) ? <MenuSeparator /> : null}
            {actions.map((a) => (
              <MenuItem
                key={`${a.method}-${a.name}`}
                danger={runner.isDanger(a)}
                onClick={() => (close(), runner.runAction(a, row))}
              >
                {runner.actionLabel(a)}
              </MenuItem>
            ))}
            {runner.canDelete ? (
              <>
                <MenuSeparator />
                <MenuItem icon="trash" danger onClick={() => (close(), runner.runDelete(row))}>
                  {t('delete', { defaultValue: 'Delete' })}
                </MenuItem>
              </>
            ) : null}
          </>
        )}
      </Dropdown>
    )
  }

  const searchable = (meta?.availableSearch?.length ?? 0) > 0

  return (
    <>
      <PageHeader
        title={title}
        subtitle={
          data ? t('totalRecords', { defaultValue: '{{count}} records', count: total }) : undefined
        }
        actions={
          canCreate ? (
            <Button variant="primary" icon="plus" onClick={() => navigate(`/${resource.key}/new`)}>
              {t('createNew', {
                defaultValue: 'New {{name}}',
                name: singularName(resource.subject).toLowerCase(),
              })}
            </Button>
          ) : null
        }
      />
      <Card flush>
        <div className="toolbar">
          {searchable ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                patch({ search })
              }}
            >
              <SearchInput
                value={search}
                placeholder={t('search', { defaultValue: 'Search…' })}
                aria-label={t('search', { defaultValue: 'Search…' })}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>
          ) : null}
          {list.filters.map((f) => (
            <FilterControl
              key={f.name}
              field={f}
              label={labels.field(f.name)}
              value={filterValues[f.name]}
              onChange={(v) => patch({ [f.name]: v })}
            />
          ))}
          {activeFilters || query.search ? (
            <Button
              variant="ghost"
              size="sm"
              icon="x"
              onClick={() => {
                setSearch('')
                patch({
                  search: undefined,
                  ...Object.fromEntries(list.filters.map((f) => [f.name, undefined])),
                })
              }}
            >
              {t('clear', { defaultValue: 'Clear' })}
            </Button>
          ) : null}
          <span className="toolbar-spacer" />
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            icon="refresh"
            aria-label={t('refresh', { defaultValue: 'Refresh' })}
            loading={isFetching && !isLoading}
            onClick={() => refetch()}
          />
          {candidates.length > 0 ? (
            <Dropdown
              trigger={({ toggle }) => (
                <Button size="sm" icon="columns" onClick={toggle}>
                  {t('columns', { defaultValue: 'Columns' })}
                </Button>
              )}
            >
              <MenuLabel>{t('visibleColumns', { defaultValue: 'Visible columns' })}</MenuLabel>
              {candidates.map((c) => (
                <div key={c.key} className="menu-item">
                  <Checkbox
                    checked={visibleKeys.includes(c.key)}
                    onChange={() => toggleColumn(c.key)}
                    label={labels.field(c.key)}
                  />
                </div>
              ))}
            </Dropdown>
          ) : null}
        </div>

        {error ? (
          <div style={{ padding: 16 }}>
            <ErrorAlert
              title={t('loadFailed', { defaultValue: 'Could not load data' })}
              message={(error as Error).message}
              onRetry={() => refetch()}
              retryLabel={t('retry', { defaultValue: 'Retry' })}
            />
          </div>
        ) : isLoading ? (
          <TableSkeleton columns={Math.max(visible.length, 5)} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={t('noResults', { defaultValue: 'No results' })}
            description={t('noResultsHint', {
              defaultValue: 'Try changing the search or filters.',
            })}
          />
        ) : (
          <>
            <DataGrid
              columns={visible}
              rows={rows}
              label={labels.field}
              sortable={sortable}
              sort={sort}
              onSort={onSort}
              onRowClick={canView ? (row) => navigate(`/${resource.key}/${row.id}`) : undefined}
              rowActions={rowActions}
            />
            {list.paged && pagination ? (
              <Pagination
                page={pagination.page}
                perPage={pagination.perPage}
                totalPage={pagination.totalPage}
                totalRecord={pagination.totalRecord}
                onPage={(p) => patch({ page: p }, true)}
                onPerPage={(n) => patch({ perPage: n })}
                labels={{
                  rowsPerPage: t('rowsPerPage', { defaultValue: 'Rows per page' }),
                  of: t('of', { defaultValue: 'of' }),
                  previous: t('previous', { defaultValue: 'Previous' }),
                  next: t('next', { defaultValue: 'Next' }),
                }}
              />
            ) : null}
          </>
        )}
      </Card>
      {runner.element}
    </>
  )
}
