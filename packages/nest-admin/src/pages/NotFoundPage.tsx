import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState } from '../components/ui'

export default function NotFoundPage() {
  const { t } = useTranslation('common')
  return (
    <EmptyState
      icon="search"
      title={t('notFoundTitle', { defaultValue: 'Page not found' })}
      description={t('notFoundMessage', {
        defaultValue: 'The page you are looking for does not exist.',
      })}
      action={
        <Link to="/dashboard">
          <Button variant="primary">{t('goHome', { defaultValue: 'Back to dashboard' })}</Button>
        </Link>
      }
    />
  )
}
