import type { ReactNode } from 'react'

export type DescriptionItem = { key: string; label: ReactNode; value: ReactNode; wide?: boolean }

export function DescriptionList({ items }: { items: DescriptionItem[] }) {
  return (
    <dl className="dl">
      {items.map((item) => (
        <div key={item.key} className={`dl-row${item.wide ? ' is-wide' : ''}`}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
