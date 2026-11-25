import { useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog, Button, Modal } from '../ui'
import { FieldInput } from './FieldInput'
import { ApiError } from '../../lib/apiError'
import { humanize } from '../../lib/format'
import { useLabels } from '../../lib/labels'
import { sendRequest } from '../../lib/resourceApi'
import {
  buildBody,
  initialValues,
  topLevelErrors,
  validate,
  type FormValues,
} from '../../lib/resourceForm'
import { useCan } from '../../hooks/useCan'
import type { ActionMeta, OperationMeta, ResourceMeta } from '../../types/resource'

type Row = Record<string, any>
type Pending =
  | { kind: 'action'; action: ActionMeta; row: Row }
  | { kind: 'delete'; row: Row }
  | null

const DANGER = new Set(['inactive', 'reset', 'delete', 'block'])

/** Dialogs and permission checks for row actions and delete, shared by the list and detail pages. */
export function useActionRunner(resource: ResourceMeta, onDone?: () => void) {
  const { t } = useTranslation('common')
  const { t: tm } = useTranslation('module')
  const can = useCan()
  const qc = useQueryClient()
  const labels = useLabels(resource.key)
  const [pending, setPending] = useState<Pending>(null)
  const [busy, setBusy] = useState(false)
  const [values, setValues] = useState<FormValues>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const allowed = (op?: OperationMeta) =>
    !!op && can(op.subject ?? resource.subject, op.action ?? 'read')

  const actionLabel = (a: ActionMeta) =>
    tm(`${resource.key}.actions.${a.name}`, { defaultValue: humanize(a.name) })

  const visibleActions = (row: Row): ActionMeta[] =>
    resource.actions.filter((a) => {
      if (!allowed(a)) return false
      if (typeof row.isActive === 'boolean') {
        if (a.name === 'active' && row.isActive) return false
        if (a.name === 'inactive' && !row.isActive) return false
      }
      return true
    })

  const canDelete = !!resource.delete && allowed(resource.delete)

  const close = () => {
    if (busy) return
    setPending(null)
    setErrors({})
  }

  const open = (next: Pending) => {
    setErrors({})
    if (next?.kind === 'action' && next.action.body) setValues(initialValues(next.action.body))
    setPending(next)
  }

  const finish = () => {
    qc.invalidateQueries({ queryKey: ['list', resource.key] })
    qc.invalidateQueries({ queryKey: ['detail', resource.key] })
    qc.invalidateQueries({ queryKey: ['child', resource.key] })
    onDone?.()
  }

  const run = async () => {
    if (!pending) return
    const op: OperationMeta = pending.kind === 'delete' ? resource.delete! : pending.action
    const body = pending.kind === 'action' ? pending.action.body : undefined
    if (body) {
      const found = validate(body, values, 'create', {
        required: t('required', { defaultValue: 'This field is required' }),
        locales: t('requiredLocales', { defaultValue: 'Fill in every language' }),
      })
      if (Object.keys(found).length > 0) {
        setErrors(found)
        return
      }
    }
    setBusy(true)
    try {
      await sendRequest(op, { id: pending.row.id }, body ? buildBody(body, values) : undefined)
      toast.success(t('done', { defaultValue: 'Done' }))
      setPending(null)
      finish()
    } catch (err) {
      const apiErr = ApiError.fromUnknown(err)
      setErrors(topLevelErrors(apiErr.getErrors()))
      apiErr.showError()
    } finally {
      setBusy(false)
    }
  }

  let element: ReactNode = null
  if (pending?.kind === 'delete') {
    element = (
      <ConfirmDialog
        open
        title={t('confirmDeleteTitle', { defaultValue: 'Delete this record?' })}
        message={t('confirmDeleteMessage', { defaultValue: 'This action cannot be undone.' })}
        confirmLabel={t('delete', { defaultValue: 'Delete' })}
        cancelLabel={t('cancel', { defaultValue: 'Cancel' })}
        variant="danger"
        loading={busy}
        onConfirm={run}
        onClose={close}
      />
    )
  } else if (pending?.kind === 'action') {
    const { action } = pending
    const danger = DANGER.has(action.name)
    element = action.body ? (
      <Modal
        open
        title={actionLabel(action)}
        onClose={close}
        footer={
          <>
            <Button onClick={close} disabled={busy}>
              {t('cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={run}>
              {t('submit', { defaultValue: 'Submit' })}
            </Button>
          </>
        }
      >
        <div className="stack">
          {action.body.map((f) => (
            <FieldInput
              key={f.name}
              field={f}
              label={labels.field(f.name)}
              value={values[f.name]}
              error={errors[f.name]}
              onChange={(v) => setValues((prev) => ({ ...prev, [f.name]: v }))}
            />
          ))}
        </div>
      </Modal>
    ) : (
      <ConfirmDialog
        open
        title={actionLabel(action)}
        message={t('confirmAction', { defaultValue: 'Are you sure you want to continue?' })}
        confirmLabel={t('confirm', { defaultValue: 'Confirm' })}
        cancelLabel={t('cancel', { defaultValue: 'Cancel' })}
        variant={danger ? 'danger' : 'primary'}
        loading={busy}
        onConfirm={run}
        onClose={close}
      />
    )
  }

  return {
    allowed,
    visibleActions,
    actionLabel,
    canDelete,
    runAction: (action: ActionMeta, row: Row) => open({ kind: 'action', action, row }),
    runDelete: (row: Row) => open({ kind: 'delete', row }),
    isDanger: (a: ActionMeta) => DANGER.has(a.name),
    element,
  }
}
