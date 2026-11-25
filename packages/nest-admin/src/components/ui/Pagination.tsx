import { Icon } from './Icon'
import { Select } from './Form'

/** Page numbers around the current page, with `null` standing in for an ellipsis. */
function pageWindow(page: number, total: number): Array<number | null> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set<number>([1, total, page - 1, page, page + 1])
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p))
  if (page >= total - 2) [total - 1, total - 2, total - 3].forEach((p) => pages.add(p))
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out: Array<number | null> = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null)
    out.push(p)
  })
  return out
}

export type PaginationProps = {
  page: number
  perPage: number
  totalPage: number
  totalRecord: number
  perPageOptions?: number[]
  onPage: (page: number) => void
  onPerPage?: (perPage: number) => void
  labels?: { rowsPerPage: string; of: string; previous: string; next: string }
}

export function Pagination({
  page,
  perPage,
  totalPage,
  totalRecord,
  perPageOptions = [10, 20, 50, 100],
  onPage,
  onPerPage,
  labels = { rowsPerPage: 'Rows per page', of: 'of', previous: 'Previous', next: 'Next' },
}: PaginationProps) {
  const from = totalRecord === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, totalRecord)

  return (
    <div className="table-footer">
      <div className="page-info">
        {from}–{to} {labels.of} {totalRecord}
      </div>
      <nav className="pagination" aria-label="Pagination">
        <button
          type="button"
          className="page-btn"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label={labels.previous}
        >
          <Icon name="chevron-left" size={16} />
        </button>
        {pageWindow(page, Math.max(totalPage, 1)).map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} className="page-info">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`page-btn${p === page ? ' is-current' : ''}`}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onPage(p)}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className="page-btn"
          disabled={page >= totalPage}
          onClick={() => onPage(page + 1)}
          aria-label={labels.next}
        >
          <Icon name="chevron-right" size={16} />
        </button>
      </nav>
      {onPerPage ? (
        <label className="page-size">
          {labels.rowsPerPage}
          <Select small value={perPage} onChange={(e) => onPerPage(Number(e.target.value))}>
            {[...new Set([...perPageOptions, perPage])]
              .sort((a, b) => a - b)
              .map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
          </Select>
        </label>
      ) : (
        <span />
      )}
    </div>
  )
}
