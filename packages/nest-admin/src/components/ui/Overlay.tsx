import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Button, type ButtonVariant } from './Button'
import { Icon, type IconName } from './Icon'

/* ---------- Dropdown / Menu ---------- */

export function Dropdown({
  trigger,
  children,
  align = 'right',
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  children: ReactNode | ((close: () => void) => ReactNode)
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="dropdown" ref={ref} onClick={(e) => e.stopPropagation()}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open ? (
        <div className={`dropdown-menu${align === 'left' ? ' is-left' : ''}`} role="menu">
          {typeof children === 'function' ? children(close) : children}
        </div>
      ) : null}
    </div>
  )
}

export function MenuItem({
  icon,
  danger,
  disabled,
  onClick,
  children,
}: {
  icon?: IconName
  danger?: boolean
  disabled?: boolean
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`menu-item${danger ? ' is-danger' : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      {icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </button>
  )
}

export const MenuSeparator = () => <div className="menu-sep" role="separator" />
export const MenuLabel = ({ children }: { children: ReactNode }) => (
  <div className="menu-label">{children}</div>
)

/* ---------- Modal ---------- */

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function Modal({
  open,
  title,
  onClose,
  footer,
  children,
  size = 'md',
}: {
  open: boolean
  title: ReactNode
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
  size?: 'md' | 'lg'
}) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    const first = dialog?.querySelector<HTMLElement>('input,select,textarea') ?? dialog
    first?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open])

  if (!open) return null

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab' || !dialogRef.current) return
    const nodes = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
    if (nodes.length === 0) return
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={onKeyDown}
    >
      <div
        className={`modal${size === 'lg' ? ' modal-lg' : ''}`}
        role="dialog"
        aria-modal="true"
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            icon="x"
            aria-label="Close"
            onClick={onClose}
          />
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'primary',
  loading = false,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: ReactNode
  message?: ReactNode
  confirmLabel: string
  cancelLabel: string
  variant?: ButtonVariant
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message ? <p>{message}</p> : null}
    </Modal>
  )
}
