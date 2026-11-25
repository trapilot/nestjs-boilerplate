import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Card, EmptyState, ErrorAlert, Skeleton } from '../components/ui'
import { FieldInput } from '../components/resource/FieldInput'
import { PageHeader } from '../components/PageHeader'
import { useCan } from '../hooks/useCan'
import { ApiError } from '../lib/apiError'
import { rowTitle } from '../lib/format'
import { singularName, useLabels } from '../lib/labels'
import { fetchOne, sendRequest } from '../lib/resourceApi'
import {
  buildBody,
  initialValues,
  topLevelErrors,
  validate,
  type FormValues,
} from '../lib/resourceForm'
import { OVERRIDES } from '../overrides'
import type { ResourceMeta } from '../types/resource'

export default function ResourceFormPage({
  resource,
  mode,
}: {
  resource: ResourceMeta
  mode: 'create' | 'edit'
}) {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t } = useTranslation('common')
  const can = useCan()
  const labels = useLabels(resource.key)
  const op = mode === 'create' ? resource.create! : resource.update!
  const fields = op.body
  const sourcePath = mode === 'edit' ? resource.get?.path : resource.create?.template

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: [mode === 'edit' ? 'detail' : 'template', resource.key, id],
    queryFn: () => fetchOne(sourcePath!, { id }),
    enabled: !!sourcePath,
  })

  const [values, setValues] = useState<FormValues>(() => initialValues(fields))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(!sourcePath)

  useEffect(() => {
    if (data && !loaded) {
      setValues(initialValues(fields, data))
      setLoaded(true)
    }
  }, [data, loaded, fields])

  const singular = singularName(resource.subject)
  const title = useMemo(
    () =>
      mode === 'create'
        ? t('createTitle', { defaultValue: 'New {{name}}', name: singular.toLowerCase() })
        : t('editTitle', {
            defaultValue: 'Edit {{name}}',
            name: data ? rowTitle(data, singular) : singular.toLowerCase(),
          }),
    [mode, singular, data, t],
  )

  const CustomForm = OVERRIDES[resource.key]?.form
  if (CustomForm) return <CustomForm resource={resource} mode={mode} />

  if (
    !can(op.subject ?? resource.subject, op.action ?? (mode === 'create' ? 'create' : 'update'))
  ) {
    return (
      <EmptyState
        icon="shield"
        title={t('forbidden', { defaultValue: 'You do not have access to this page' })}
      />
    )
  }

  const back = () => navigate(mode === 'edit' ? `/${resource.key}/${id}` : `/${resource.key}`)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const found = validate(fields, values, mode, {
      required: t('required', { defaultValue: 'This field is required' }),
      locales: t('requiredLocales', { defaultValue: 'Fill in every language' }),
    })
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setSaving(true)
    try {
      const result = (await sendRequest(op, { id }, buildBody(fields, values))) as {
        id?: string | number
      } | null
      toast.success(t('saved', { defaultValue: 'Saved' }))
      qc.invalidateQueries({ queryKey: ['list', resource.key] })
      qc.invalidateQueries({ queryKey: ['detail', resource.key] })
      const targetId = mode === 'edit' ? id : result?.id
      navigate(
        resource.get && targetId !== undefined
          ? `/${resource.key}/${targetId}`
          : `/${resource.key}`,
      )
    } catch (err) {
      const apiErr = ApiError.fromUnknown(err)
      setErrors(topLevelErrors(apiErr.getErrors()))
      apiErr.showError()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader title={title} />
      {error ? (
        <ErrorAlert
          title={t('loadFailed', { defaultValue: 'Could not load data' })}
          message={(error as Error).message}
          onRetry={() => refetch()}
          retryLabel={t('retry', { defaultValue: 'Retry' })}
        />
      ) : (
        <form onSubmit={submit} noValidate>
          <Card
            footer={
              <>
                <Button onClick={back} disabled={saving}>
                  {t('cancel', { defaultValue: 'Cancel' })}
                </Button>
                <Button type="submit" variant="primary" loading={saving} disabled={isLoading}>
                  {t('save', { defaultValue: 'Save' })}
                </Button>
              </>
            }
          >
            {isLoading ? (
              <div className="form-grid">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} height={36} />
                ))}
              </div>
            ) : (
              <div className="form-grid">
                {fields.map((f) => (
                  <FieldInput
                    key={f.name}
                    field={f}
                    label={labels.field(f.name)}
                    value={values[f.name]}
                    error={errors[f.name]}
                    onChange={(v) => {
                      setValues((prev) => ({ ...prev, [f.name]: v }))
                      if (errors[f.name]) setErrors((prev) => ({ ...prev, [f.name]: '' }))
                    }}
                  />
                ))}
              </div>
            )}
          </Card>
        </form>
      )}
    </>
  )
}
