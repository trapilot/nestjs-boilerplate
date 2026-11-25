import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button, FormField, Input, Select, Switch, Textarea } from '../ui'
import { FilePreview } from '../FilePreview'
import { MultiLangRichTextEditor } from '../MultiLangRichTextEditor'
import { enumOptions, humanize, itemEnumOptions } from '../../lib/format'
import { fetchLookup } from '../../lib/resourceApi'
import { initialValues } from '../../lib/resourceForm'
import type { FieldMeta } from '../../types/resource'

type Props = {
  field: FieldMeta
  value: any
  onChange: (value: any) => void
  label?: string
  error?: string
  /** Hide the label (the control renders its own, e.g. switches). */
  bare?: boolean
}

export function LookupSelect({
  path,
  value,
  onChange,
  required,
  invalid,
  small,
  allLabel,
}: {
  path: string
  value: any
  onChange: (value: string) => void
  required?: boolean
  invalid?: boolean
  small?: boolean
  allLabel?: string
}) {
  const { t } = useTranslation('common')
  const { data = [] } = useQuery({
    queryKey: ['lookup', path],
    queryFn: () => fetchLookup(path),
    staleTime: 5 * 60 * 1000,
  })
  return (
    <Select
      small={small}
      invalid={invalid}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    >
      {!required || allLabel ? (
        <option value="">{allLabel ?? t('select', { defaultValue: 'Select…' })}</option>
      ) : null}
      {data.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </Select>
  )
}

function TagInput({
  value,
  onChange,
  number,
}: {
  value: any[]
  onChange: (v: any[]) => void
  number?: boolean
}) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const parts = draft
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length === 0) return
    onChange([...value, ...parts.map((p) => (number ? Number(p) : p))])
    setDraft('')
  }
  return (
    <div className="tag-input">
      {value.map((v, i) => (
        <span key={i} className="chip is-on">
          {String(v)}
          <button
            type="button"
            aria-label="Remove"
            style={{ border: 0, background: 'transparent', color: 'inherit', padding: 0 }}
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add()
          }
        }}
        onBlur={add}
      />
    </div>
  )
}

function ArrayInput({
  field,
  value,
  onChange,
}: {
  field: FieldMeta
  value: any[]
  onChange: (v: any[]) => void
}) {
  const { t } = useTranslation('common')
  const list = Array.isArray(value) ? value : []

  if (field.itemType === 'enum') {
    const options = itemEnumOptions(field)
    return (
      <div className="chip-group">
        {options.map((opt) => {
          const on = list.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              className={`chip${on ? ' is-on' : ''}`}
              aria-pressed={on}
              onClick={() => onChange(on ? list.filter((v) => v !== opt) : [...list, opt])}
            >
              {humanize(opt)}
            </button>
          )
        })}
      </div>
    )
  }

  if (field.itemType === 'object' && field.itemFields) {
    const itemFields = field.itemFields
    return (
      <div>
        {list.map((item, index) => (
          <div key={index} className="repeat-row">
            <Button
              className="repeat-remove"
              variant="ghost"
              size="sm"
              iconOnly
              icon="trash"
              aria-label={t('remove', { defaultValue: 'Remove' })}
              onClick={() => onChange(list.filter((_, i) => i !== index))}
            />
            <div className="form-grid">
              {itemFields.map((f) => (
                <FieldInput
                  key={f.name}
                  field={f}
                  value={item?.[f.name]}
                  onChange={(v) =>
                    onChange(list.map((it, i) => (i === index ? { ...it, [f.name]: v } : it)))
                  }
                />
              ))}
            </div>
          </div>
        ))}
        <Button
          icon="plus"
          size="sm"
          onClick={() => onChange([...list, initialValues(itemFields)])}
        >
          {t('add', { defaultValue: 'Add' })}
        </Button>
      </div>
    )
  }

  return <TagInput value={list} onChange={onChange} number={field.itemType === 'number'} />
}

const WIDE: FieldMeta['type'][] = ['locale', 'object', 'array']

export function FieldInput({ field, value, onChange, label, error, bare }: Props) {
  const { t } = useTranslation('common')
  const text = label ?? humanize(field.name)
  const id = `f-${field.name}`
  const required = !!field.required && !field.nullable
  const invalid = !!error
  const help = field.description

  let control
  switch (field.type) {
    case 'boolean':
      return (
        <FormField help={help} error={error}>
          <Switch checked={!!value} onChange={onChange} label={text} />
        </FormField>
      )
    case 'enum':
      control = (
        <Select
          id={id}
          invalid={invalid}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          {!required ? <option value="">{t('select', { defaultValue: 'Select…' })}</option> : null}
          {enumOptions(field).map((o) => (
            <option key={o} value={o}>
              {humanize(o)}
            </option>
          ))}
        </Select>
      )
      break
    case 'number':
      control = field.lookup ? (
        <LookupSelect
          path={field.lookup}
          value={value}
          onChange={onChange}
          required={required}
          invalid={invalid}
        />
      ) : (
        <Input
          id={id}
          type="number"
          invalid={invalid}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
      break
    case 'date':
      control = (
        <Input
          id={id}
          type="date"
          invalid={invalid}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
      break
    case 'datetime':
      control = (
        <Input
          id={id}
          type="datetime-local"
          invalid={invalid}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
      break
    case 'file':
      control = (
        <div className="file-field">
          <input
            id={id}
            type="file"
            className="input"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          />
          {value instanceof File ? <FilePreview file={value} /> : null}
        </div>
      )
      break
    case 'locale':
      control = (
        <MultiLangRichTextEditor
          field={field.name}
          format={field.localeFormat === 'line' ? undefined : field.localeFormat}
          value={value ?? {}}
          onChange={onChange}
          languages={field.languages ?? ['en']}
        />
      )
      break
    case 'object':
      control = field.fields ? (
        <div className="subcard">
          <div className="form-grid">
            {field.fields.map((f) => (
              <FieldInput
                key={f.name}
                field={f}
                value={value?.[f.name]}
                onChange={(v) => onChange({ ...(value ?? {}), [f.name]: v })}
              />
            ))}
          </div>
        </div>
      ) : (
        <Textarea
          id={id}
          invalid={invalid}
          spellCheck={false}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
      break
    case 'array':
      control = <ArrayInput field={field} value={value} onChange={onChange} />
      break
    default: {
      const lower = field.name.toLowerCase()
      if (field.lookup) {
        control = (
          <LookupSelect
            path={field.lookup}
            value={value}
            onChange={onChange}
            required={required}
            invalid={invalid}
          />
        )
      } else if (/^(description|address|note|notes|remark|message)$/.test(lower)) {
        control = (
          <Textarea
            id={id}
            invalid={invalid}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      } else {
        const type = lower.includes('password')
          ? 'password'
          : lower === 'email'
            ? 'email'
            : lower === 'url' || lower.endsWith('url')
              ? 'url'
              : lower.includes('phone')
                ? 'tel'
                : 'text'
        control = (
          <Input
            id={id}
            type={type}
            invalid={invalid}
            autoComplete={type === 'password' ? 'new-password' : 'off'}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      }
    }
  }

  return (
    <FormField
      label={bare ? undefined : text}
      htmlFor={id}
      required={required}
      help={help}
      error={error}
      wide={WIDE.includes(field.type) || field.name === 'description'}
    >
      {control}
    </FormField>
  )
}
