import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RESOURCES } from '../generated/resources'
import { humanize, titleCase } from '../lib/format'
import { pluralName } from '../lib/labels'

export function Breadcrumb() {
  const { pathname } = useLocation()
  const { t } = useTranslation('common')
  const { t: tm } = useTranslation('module')
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) return null

  const crumbs = parts.map((part, i) => {
    const to = '/' + parts.slice(0, i + 1).join('/')
    let label: string
    if (i === 0) {
      const resource = RESOURCES.find((r) => r.key === part)
      label = resource
        ? tm(`${resource.key}.title`, { defaultValue: titleCase(pluralName(resource.basePath)) })
        : t(part, { defaultValue: humanize(part) })
    } else if (part === 'new' || part === 'edit') {
      label = t(part, { defaultValue: humanize(part) })
    } else {
      label = `#${part}`
    }
    return { to, label }
  })

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {crumbs.map((c, i) => (
        <span key={c.to} style={{ display: 'contents' }}>
          {i > 0 ? <span aria-hidden="true">/</span> : null}
          {i === crumbs.length - 1 ? (
            <span className="is-current">{c.label}</span>
          ) : (
            <Link to={c.to}>{c.label}</Link>
          )}
        </span>
      ))}
    </nav>
  )
}
