import { useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { EmptyState, ErrorAlert, Pagination, TableSkeleton } from '../ui'
import { DataGrid } from './DataGrid'
import { FilterControl } from '../../pages/ResourceListPage'
import { buildColumns, defaultVisibleKeys } from '../../lib/columns'
import { useLabels } from '../../lib/labels'
import { buildPath, fetchList } from '../../lib/resourceApi'
import type { ChildListMeta } from '../../types/resource'

/** Sub-list rendered on a parent's detail page (e.g. activity logs of a user). */
export function ChildList({
  child,
  parentKey,
  parentId,
}: {
  child: ChildListMeta
  parentKey: string
  parentId: string
}) {
  const { t } = useTranslation('common')
  const labels = useLabels(child.resource)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [filters, setFilters] = useState<Record<string, string>>({})

  const path = buildPath(child.path, { [child.param]: parentId })
  const query = { ...(child.paged ? { page, perPage } : {}), ...filters }
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['child', parentKey, child.key, parentId, query],
    queryFn: () => fetchList(path, query),
    placeholderData: keepPreviousData,
  })
  const rows = data?.rows ?? []
  const columns = useMemo(() => {
    const all = buildColumns(child.columns, rows)
    const keys = defaultVisibleKeys(all)
    return all.filter((c) => keys.includes(c.key))
  }, [child.columns, rows])
  const pagination = data?.meta?.pagination

  return (
    <div>
      {child.filters.length > 0 ? (
        <div className="toolbar">
          {child.filters.map((f) => (
            <FilterControl
              key={f.name}
              field={f}
              label={labels.field(f.name)}
              value={filters[f.name] ?? ''}
              onChange={(v) => {
                setPage(1)
                setFilters((prev) => ({ ...prev, [f.name]: v }))
              }}
            />
          ))}
        </div>
      ) : null}
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
        <TableSkeleton columns={5} />
      ) : rows.length === 0 ? (
        <EmptyState title={t('noResults', { defaultValue: 'No results' })} />
      ) : (
        <>
          <DataGrid columns={columns} rows={rows} label={labels.field} />
          {child.paged && pagination ? (
            <Pagination
              page={pagination.page}
              perPage={pagination.perPage}
              totalPage={pagination.totalPage}
              totalRecord={pagination.totalRecord}
              onPage={setPage}
              onPerPage={(n) => (setPerPage(n), setPage(1))}
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
    </div>
  )
}
