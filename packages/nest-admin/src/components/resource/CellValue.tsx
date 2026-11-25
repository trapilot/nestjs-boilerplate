import { useTranslation } from 'react-i18next'
import { Badge } from '../ui'
import {
  displayName,
  formatDate,
  humanize,
  isDateKey,
  isDateOnlyKey,
  isImageKey,
  isLocaleValue,
  isPlainObject,
  isUrlValue,
  localized,
  stripHtml,
} from '../../lib/format'
import type { FieldMeta } from '../../types/resource'

const BADGE_KEYS = /^(type|status|channel|refType|group|roleType|locale|platform|action)$/

type Props = {
  name: string
  value: unknown
  field?: FieldMeta
  /** Detail mode renders long / structured values in full instead of truncating. */
  detail?: boolean
}

function initials(text: string) {
  return text.trim().slice(0, 2).toUpperCase() || '?'
}

export function CellValue({ name, value, field, detail = false }: Props) {
  const { t } = useTranslation('common')

  if (value === undefined || value === null || value === '') {
    return <span className="muted">—</span>
  }

  if (typeof value === 'boolean' || field?.type === 'boolean') {
    const on = value === true || value === 'true'
    const active = name === 'isActive'
    return (
      <Badge tone={on ? 'success' : 'neutral'} dot>
        {active
          ? on
            ? t('active', { defaultValue: 'Active' })
            : t('inactive', { defaultValue: 'Inactive' })
          : on
            ? t('yes', { defaultValue: 'Yes' })
            : t('no', { defaultValue: 'No' })}
      </Badge>
    )
  }

  if (isLocaleValue(value)) {
    if (detail) {
      return (
        <div className="locale-list">
          {Object.entries(value).map(([lang, text]) => (
            <div key={lang} className="locale-item">
              <span className="locale-code">{lang}</span>
              <span>
                {field?.localeFormat === 'html' || /<[a-z][\s\S]*>/i.test(text)
                  ? stripHtml(text)
                  : text}
              </span>
            </div>
          ))}
        </div>
      )
    }
    const text = stripHtml(localized(value))
    return (
      <span className="cell-text" title={text}>
        {text}
      </span>
    )
  }

  if (Array.isArray(value)) {
    if (!detail) return <span className="muted">{value.length}</span>
    if (value.length === 0) return <span className="muted">—</span>
    if (value.every((v) => typeof v !== 'object')) {
      return (
        <div className="chip-group">
          {value.map((v, i) => (
            <Badge key={i}>{String(v)}</Badge>
          ))}
        </div>
      )
    }
    return <pre className="json">{JSON.stringify(value, null, 2)}</pre>
  }

  if (isPlainObject(value)) {
    const label = displayName(value)
    if (!detail && label) return <span className="cell-text">{label}</span>
    return detail ? (
      <pre className="json">{JSON.stringify(value, null, 2)}</pre>
    ) : (
      <span className="muted">{label ?? '{…}'}</span>
    )
  }

  const text = String(value)

  if (
    field?.type === 'date' ||
    field?.type === 'datetime' ||
    (isDateKey(name) && !isNaN(Date.parse(text)))
  ) {
    const dateOnly = field?.type === 'date' || isDateOnlyKey(name)
    return <span>{formatDate(text, !dateOnly)}</span>
  }

  if (isImageKey(name) && isUrlValue(text)) {
    return <img className="avatar" src={text} alt="" loading="lazy" />
  }
  if (isImageKey(name)) {
    return <span className="avatar">{initials(text)}</span>
  }

  if (isUrlValue(text) && text.startsWith('http')) {
    return (
      <a href={text} target="_blank" rel="noreferrer noopener" className="cell-text" title={text}>
        {text}
      </a>
    )
  }

  if (field?.type === 'enum' || BADGE_KEYS.test(name)) {
    if (text.length <= 40) return <Badge>{humanize(text)}</Badge>
  }

  if (typeof value === 'number') return <span className="cell-num">{text}</span>

  if (detail) return <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>
  return (
    <span className="cell-text" title={text}>
      {text}
    </span>
  )
}
