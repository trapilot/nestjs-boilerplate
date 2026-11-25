import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon, Table } from '../ui'
import type { ColumnDef } from '../../lib/columns'
import { CellValue } from './CellValue'

export type SortState = { key: string; dir: 'asc' | 'desc' } | null

type Props = {
  columns: ColumnDef[]
  rows: Array<Record<string, any>>
  label: (key: string) => string
  sortable?: string[]
  sort?: SortState
  onSort?: (key: string) => void
  onRowClick?: (row: Record<string, any>) => void
  rowActions?: (row: Record<string, any>) => ReactNode
  compact?: boolean
}

export function DataGrid({
  columns,
  rows,
  label,
  sortable = [],
  sort,
  onSort,
  onRowClick,
  rowActions,
  compact = true,
}: Props) {
  const { t } = useTranslation('common')
  return (
    <Table compact={compact}>
      <thead>
        <tr>
          {columns.map((c) => {
            const canSort = sortable.includes(c.key)
            const active = sort?.key === c.key
            return (
              <th
                key={c.key}
                className={canSort ? 'is-sortable' : undefined}
                onClick={canSort ? () => onSort?.(c.key) : undefined}
                aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                <span className="th-inner">
                  {label(c.key)}
                  {canSort ? (
                    <Icon
                      name={active && sort!.dir === 'asc' ? 'arrow-up' : 'arrow-down'}
                      size={12}
                      className={`th-sort${active ? ' is-active' : ''}`}
                    />
                  ) : null}
                </span>
              </th>
            )
          })}
          {rowActions ? (
            <th className="col-actions">
              <span className="sr-only">{t('actions', { defaultValue: 'Actions' })}</span>
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={row.id ?? i}
            className={onRowClick ? 'is-clickable' : undefined}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            {columns.map((c) => (
              <td key={c.key}>
                <CellValue name={c.key} value={row[c.key]} field={c.field} />
              </td>
            ))}
            {rowActions ? <td className="col-actions">{rowActions(row)}</td> : null}
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
