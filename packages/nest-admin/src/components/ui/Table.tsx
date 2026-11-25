import type { ReactNode } from 'react'
import { Skeleton } from './Feedback'

export function Table({ compact = false, children }: { compact?: boolean; children: ReactNode }) {
  return (
    <div className="table-wrap">
      <table className={`table${compact ? ' is-compact' : ''}`}>{children}</table>
    </div>
  )
}

export function TableSkeleton({ columns, rows = 6 }: { columns: number; rows?: number }) {
  return (
    <Table>
      <thead>
        <tr>
          {Array.from({ length: columns }).map((_, i) => (
            <th key={i}>
              <Skeleton width={60} height={10} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: columns }).map((_, c) => (
              <td key={c}>
                <Skeleton width={c === 0 ? 36 : `${55 + ((r * 7 + c * 13) % 40)}%`} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
