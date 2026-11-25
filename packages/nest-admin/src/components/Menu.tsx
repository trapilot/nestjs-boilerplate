import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUser } from '../contexts/UserContext'
import { generateMenuItems, MenuItem } from '../utils/route'
import { Icon, type IconName } from './ui'

const ICONS: Record<string, IconName> = {
  DASHBOARD: 'layout-dashboard',
  USER: 'user',
  CUSTOMER: 'users',
  ROLE: 'shield',
  POLICY: 'shield',
  API_KEY: 'key',
  APP_VERSION: 'smartphone',
  CONTENT: 'file-text',
  NOTIFICATION: 'bell',
  SETTING: 'settings',
  ACTIVITY_LOG: 'activity',
  COUNTRY: 'globe',
  DISTRICT: 'globe',
}

export function Menu({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useUser()
  const { t } = useTranslation('common')
  const location = useLocation()
  const [closed, setClosed] = useState<Record<string, boolean>>({})

  const isActive = (path: string): boolean =>
    !!path && (location.pathname === path || location.pathname.startsWith(path + '/'))

  const menuItems = useMemo<MenuItem[]>(() => {
    if (!user?.policies) return []
    return generateMenuItems(user.policies)
  }, [user])

  const link = (item: MenuItem) => (
    <Link
      key={item.key}
      to={item.path}
      title={item.title}
      className={`nav-link${isActive(item.path) ? ' is-active' : ''}`}
      onClick={onNavigate}
    >
      <Icon name={ICONS[item.subject ?? ''] ?? 'file-text'} />
      <span className="nav-label">{item.title}</span>
    </Link>
  )

  if (menuItems.length === 0) {
    return (
      <div className="muted nav-label">
        {t('noMenu', { defaultValue: 'No menu items available' })}
      </div>
    )
  }

  return (
    <nav aria-label="Main">
      {menuItems.map((item) => {
        if (!item.group) return <div key={item.key}>{link(item)}</div>
        const open = !closed[item.key]
        return (
          <div key={item.key} className="nav-group">
            <button
              type="button"
              className="nav-group-title"
              aria-expanded={open}
              onClick={() => setClosed((prev) => ({ ...prev, [item.key]: open }))}
            >
              <span>{item.title}</span>
              <Icon name={open ? 'chevron-down' : 'chevron-right'} size={14} />
            </button>
            {open ? item.children?.map(link) : null}
          </div>
        )
      })}
    </nav>
  )
}
