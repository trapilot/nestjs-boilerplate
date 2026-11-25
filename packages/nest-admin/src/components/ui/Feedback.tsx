import type { CSSProperties, ReactNode } from 'react'
import { Button } from './Button'
import { Icon, type IconName } from './Icon'

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary'

export function Badge({
  tone = 'neutral',
  dot = false,
  children,
}: {
  tone?: BadgeTone
  dot?: boolean
  children: ReactNode
}) {
  const classes = ['badge', tone !== 'neutral' ? `badge-${tone}` : '', dot ? 'badge-dot' : '']
    .filter(Boolean)
    .join(' ')
  return <span className={classes}>{children}</span>
}

export function Card({
  title,
  actions,
  footer,
  children,
  bodyClassName,
  className,
  flush = false,
}: {
  title?: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  children: ReactNode
  bodyClassName?: string
  className?: string
  /** Render children without body padding (tables). */
  flush?: boolean
}) {
  return (
    <section className={`card${className ? ` ${className}` : ''}`}>
      {title || actions ? (
        <header className="card-header">
          <h3 className="card-title">{title}</h3>
          {actions}
        </header>
      ) : null}
      {flush ? (
        children
      ) : (
        <div className={`card-body${bodyClassName ? ` ${bodyClassName}` : ''}`}>{children}</div>
      )}
      {footer ? <footer className="card-footer">{footer}</footer> : null}
    </section>
  )
}

export function Skeleton({
  width = '100%',
  height = 14,
  style,
}: {
  width?: number | string
  height?: number | string
  style?: CSSProperties
}) {
  return <span className="skeleton" style={{ width, height, ...style }} aria-hidden="true" />
}

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
}: {
  icon?: IconName
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={22} />
      </div>
      <div className="empty-title">{title}</div>
      {description ? <div>{description}</div> : null}
      {action}
    </div>
  )
}

export function ErrorAlert({
  title,
  message,
  onRetry,
  retryLabel = 'Retry',
}: {
  title: ReactNode
  message?: ReactNode
  onRetry?: () => void
  retryLabel?: string
}) {
  return (
    <div className="alert alert-danger" role="alert">
      <Icon name="alert-circle" size={20} />
      <div className="alert-body">
        <div className="alert-title">{title}</div>
        {message ? <div>{message}</div> : null}
      </div>
      {onRetry ? (
        <Button size="sm" icon="refresh" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  )
}
