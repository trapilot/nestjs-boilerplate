import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getSummary, refreshSummary, type DashboardSummary } from '../api/dashboard'
import { Button, Card, ErrorAlert, Skeleton } from '../components/ui'
import { PageHeader } from '../components/PageHeader'
import { useAuthGuard } from '../hooks/useAuthGuard'
import { humanize } from '../lib/format'

export default function Dashboard() {
  useAuthGuard() // Protect this route
  const { t } = useTranslation('common')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const [data, setData] = useState<DashboardSummary | null>(null)

  const load = async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true)
      setFailed(null)
      setData(refresh ? await refreshSummary() : await getSummary())
    } catch (e: unknown) {
      setFailed(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const stats = Object.entries((data ?? {}) as Record<string, unknown>).filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number',
  )
  const max = Math.max(1, ...stats.map(([, v]) => v))

  return (
    <>
      <PageHeader
        title={t('dashboard', { defaultValue: 'Dashboard' })}
        actions={
          <Button icon="refresh" loading={refreshing} onClick={() => load(true)}>
            {t('refresh', { defaultValue: 'Refresh' })}
          </Button>
        }
      />
      {failed ? (
        <ErrorAlert
          title={t('loadFailed', { defaultValue: 'Could not load data' })}
          message={failed}
          onRetry={() => load()}
          retryLabel={t('retry', { defaultValue: 'Retry' })}
        />
      ) : (
        <div className="stack">
          <div className="stat-grid">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="stat-card">
                    <Skeleton width={110} height={12} />
                    <Skeleton width={70} height={30} style={{ marginTop: 10 }} />
                  </Card>
                ))
              : stats.map(([key, value]) => (
                  <Card key={key} className="stat-card">
                    <div className="stat-label">
                      {t(`dashboardStats.${key}`, {
                        defaultValue: humanize(key.replace(/^total/, '')),
                      })}
                    </div>
                    <div className="stat-value">{value.toLocaleString()}</div>
                  </Card>
                ))}
          </div>
          {!loading && stats.length > 0 ? (
            <Card title={t('overview', { defaultValue: 'Overview' })}>
              <div className="bar-chart">
                {stats.map(([key, value]) => (
                  <div key={key} className="bar-row">
                    <span className="muted">{humanize(key.replace(/^total/, ''))}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${(value / max) * 100}%` }} />
                    </div>
                    <span className="bar-value">{value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      )}
    </>
  )
}
