import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { Icon } from './Icon'

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ')

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; small?: boolean }

export function Input({ invalid, small, className, ...rest }: InputProps) {
  return (
    <input
      className={cx('input', small && 'input-sm', invalid && 'is-invalid', className)}
      {...rest}
    />
  )
}

export function SearchInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cx('input-search', className)}>
      <Icon name="search" size={16} />
      <input className="input" type="search" {...rest} />
    </div>
  )
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean; small?: boolean }

export function Select({ invalid, small, className, children, ...rest }: SelectProps) {
  return (
    <select
      className={cx('select', small && 'select-sm', invalid && 'is-invalid', className)}
      {...rest}
    >
      {children}
    </select>
  )
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }

export function Textarea({ invalid, className, ...rest }: TextareaProps) {
  return <textarea className={cx('textarea', invalid && 'is-invalid', className)} {...rest} />
}

type ToggleProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: ReactNode
  disabled?: boolean
}

export function Switch({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label className="switch">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch-track" />
      {label ? <span>{label}</span> : null}
    </label>
  )
}

export function Checkbox({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label className="checkbox">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label ? <span>{label}</span> : null}
    </label>
  )
}

type FormFieldProps = {
  label?: ReactNode
  required?: boolean
  help?: ReactNode
  error?: string
  wide?: boolean
  htmlFor?: string
  children: ReactNode
}

export function FormField({
  label,
  required,
  help,
  error,
  wide,
  htmlFor,
  children,
}: FormFieldProps) {
  return (
    <div className={cx('field', wide && 'is-wide')}>
      {label ? (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
          {required ? <span className="field-required">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? <span className="field-error">{error}</span> : null}
      {!error && help ? <span className="field-help">{help}</span> : null}
    </div>
  )
}
