import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUser } from '../contexts/UserContext'
import { readString, writeString } from '../lib/storage'
import { useTheme } from '../lib/theme'
import { Breadcrumb } from './Breadcrumb'
import { LangSwitcher } from './LangSwitcher'
import { Menu } from './Menu'
import { Button, Dropdown, Icon, MenuItem, MenuSeparator } from './ui'

const SIDEBAR_KEY = 'sidebar-collapsed'
const isMobile = () => window.matchMedia('(max-width: 900px)').matches

export function Layout() {
  const { logout, user } = useUser()
  const { t } = useTranslation('common')
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(() => readString(SIDEBAR_KEY) === '1')
  const [drawer, setDrawer] = useState(false)

  useEffect(() => setDrawer(false), [pathname])

  const toggleSidebar = () => {
    if (isMobile()) {
      setDrawer((v) => !v)
      return
    }
    setCollapsed((v) => {
      writeString(SIDEBAR_KEY, v ? '0' : '1')
      return !v
    })
  }

  const name = String(user?.name || user?.email || '')
  const avatar =
    typeof user?.avatar === 'string' && /^(https?:\/\/|\/)/.test(user.avatar) ? user.avatar : null

  return (
    <div className={`shell${collapsed ? ' is-collapsed' : ''}${drawer ? ' is-drawer-open' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">N</span>
          <span>Nest Admin</span>
        </div>
        <div className="sidebar-nav">
          <Menu onNavigate={() => setDrawer(false)} />
        </div>
      </aside>
      <div className="sidebar-overlay" onClick={() => setDrawer(false)} />
      <div className="shell-main">
        <header className="topbar">
          <Button
            variant="ghost"
            iconOnly
            icon="menu"
            aria-label={t('toggleSidebar', { defaultValue: 'Toggle sidebar' })}
            onClick={toggleSidebar}
          />
          <Breadcrumb />
          <span className="topbar-spacer" />
          <Button
            variant="ghost"
            iconOnly
            icon={theme === 'dark' ? 'sun' : 'moon'}
            aria-label={t('toggleTheme', { defaultValue: 'Toggle theme' })}
            onClick={toggle}
          />
          <LangSwitcher />
          <Dropdown
            trigger={({ toggle: open }) => (
              <button type="button" className="user-btn" onClick={open}>
                {avatar ? (
                  <img className="avatar" src={avatar} alt="" />
                ) : (
                  <span className="avatar">
                    {name.slice(0, 2).toUpperCase() || <Icon name="user" size={14} />}
                  </span>
                )}
                <span className="user-name">{name}</span>
                <Icon name="chevron-down" size={14} />
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuItem icon="user" onClick={() => (close(), navigate('/profile'))}>
                  {t('profile', { defaultValue: 'Profile' })}
                </MenuItem>
                <MenuSeparator />
                <MenuItem icon="log-out" danger onClick={() => (close(), logout())}>
                  {t('logout', { defaultValue: 'Log out' })}
                </MenuItem>
              </>
            )}
          </Dropdown>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
