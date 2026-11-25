import { useTranslation } from 'react-i18next'
import { humanize, titleCase } from './format'

/** Labels for a resource: `module:<key>.title` / `module:<key>.fields.<field>` with humanized fallbacks. */
export function useLabels(key: string) {
  const { t } = useTranslation('module')
  return {
    /** Collection title, e.g. "Api Keys". */
    title: (fallback: string) => t(`${key}.title`, { defaultValue: titleCase(fallback) }),
    field: (name: string) => t(`${key}.fields.${name}`, { defaultValue: humanize(name) }),
  }
}

/** `/api-keys` -> "api keys" (fallback text for list titles). */
export function pluralName(basePath: string): string {
  return basePath.replace(/^\//, '')
}

/** `API_KEY` -> "Api key". */
export function singularName(subject: string): string {
  return humanize(subject)
}
