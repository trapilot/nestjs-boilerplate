import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Card,
  DescriptionList,
  ErrorAlert,
  Skeleton,
  Tabs,
  type DescriptionItem,
} from '../components/ui'
import { CellValue } from '../components/resource/CellValue'
import { ChildList } from '../components/resource/ChildList'
import { useActionRunner } from '../components/resource/useActionRunner'
import { PageHeader } from '../components/PageHeader'
import { useCan } from '../hooks/useCan'
import { isHiddenKey } from '../lib/columns'
import {
  humanize,
  isLocaleValue,
  isPlainObject,
  isUrlValue,
  rowTitle,
  titleCase,
} from '../lib/format'
import { useLabels, singularName } from '../lib/labels'
import { fetchOne } from '../lib/resourceApi'
import { OVERRIDES } from '../overrides'
import type { ResourceMeta } from '../types/resource'

export default function ResourceDetailPage({ resource }: { resource: ResourceMeta }) {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation('common')
  const { t: tm } = useTranslation('module')
  const can = useCan()
  const labels = useLabels(resource.key)
  const override = OVERRIDES[resource.key]
  const [tab, setTab] = useState('details')
  const runner = useActionRunner(resource, () => {})

  const get = resource.get!
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['detail', resource.key, id],
    queryFn: () => fetchOne(get.path, { id }),
  })

  const CustomDetail = override?.detail
  if (CustomDetail) return <CustomDetail resource={resource} />

  const children = resource.children.filter((c) =>
    can(c.subject ?? resource.subject, c.action ?? 'read'),
  )
  const canEdit = !!resource.update && runner.allowed(resource.update)

  const items: DescriptionItem[] = []
  if (data) {
    const hidden = new Set(override?.hiddenColumns ?? [])
    const fieldByName = new Map(get.fields.map((f) => [f.name, f]))
    const keys = [...new Set([...get.fields.map((f) => f.name), ...Object.keys(data)])].filter(
      (k) => !isHiddenKey(k) && !hidden.has(k),
    )
    keys.sort((a, b) => (a === 'id' ? -1 : b === 'id' ? 1 : 0))
    keys.forEach((key) => {
      const value = (data as Record<string, unknown>)[key]
      if (value === undefined) return
      const wide =
        isLocaleValue(value) ||
        Array.isArray(value) ||
        (isPlainObject(value) && !isLocaleValue(value)) ||
        (typeof value === 'string' && value.length > 80)
      items.push({
        key,
        label: labels.field(key),
        value: <CellValue name={key} value={value} field={fieldByName.get(key)} detail />,
        wide,
      })
    })
  }

  const singular = singularName(resource.subject)
  const title = data ? rowTitle(data, singular) : singular
  const avatar =
    data && typeof data.avatar === 'string' && isUrlValue(data.avatar) ? data.avatar : null

  return (
    <>
      <PageHeader
        title={isLoading ? <Skeleton width={220} height={28} /> : title}
        subtitle={data && data.id !== undefined ? `${singular} #${data.id}` : undefined}
        actions={
          data ? (
            <>
              <Button icon="chevron-left" onClick={() => navigate(`/${resource.key}`)}>
                {t('back', { defaultValue: 'Back' })}
              </Button>
              {runner.visibleActions(data).map((a) => (
                <Button
                  key={`${a.method}-${a.name}`}
                  variant={runner.isDanger(a) ? 'secondary' : 'secondary'}
                  onClick={() => runner.runAction(a, data)}
                >
                  {runner.actionLabel(a)}
                </Button>
              ))}
              {canEdit ? (
                <Button
                  variant="primary"
                  icon="pencil"
                  onClick={() => navigate(`/${resource.key}/${id}/edit`)}
                >
                  {t('edit', { defaultValue: 'Edit' })}
                </Button>
              ) : null}
              {runner.canDelete ? (
                <Button variant="danger" icon="trash" onClick={() => runner.runDelete(data)}>
                  {t('delete', { defaultValue: 'Delete' })}
                </Button>
              ) : null}
            </>
          ) : null
        }
      />
      {error ? (
        <ErrorAlert
          title={t('loadFailed', { defaultValue: 'Could not load data' })}
          message={(error as Error).message}
          onRetry={() => refetch()}
          retryLabel={t('retry', { defaultValue: 'Retry' })}
        />
      ) : (
        <>
          {children.length > 0 ? (
            <Tabs
              active={tab}
              onChange={setTab}
              items={[
                { key: 'details', label: t('details', { defaultValue: 'Details' }) },
                ...children.map((c) => ({
                  key: c.key,
                  label: tm(`${resource.key}.children.${c.key}`, {
                    defaultValue: titleCase(humanize(c.resource)),
                  }),
                })),
              ]}
            />
          ) : null}
          {tab === 'details' ? (
            <Card>
              {isLoading ? (
                <div className="stack">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} width={`${40 + ((i * 17) % 50)}%`} />
                  ))}
                </div>
              ) : (
                <>
                  {avatar ? (
                    <img
                      className="avatar avatar-lg"
                      src={avatar}
                      alt=""
                      style={{ marginBottom: 16 }}
                    />
                  ) : null}
                  <DescriptionList items={items} />
                </>
              )}
            </Card>
          ) : (
            <Card flush>
              {children
                .filter((c) => c.key === tab)
                .map((c) => (
                  <ChildList key={c.key} child={c} parentKey={resource.key} parentId={id} />
                ))}
            </Card>
          )}
        </>
      )}
      {runner.element}
    </>
  )
}
