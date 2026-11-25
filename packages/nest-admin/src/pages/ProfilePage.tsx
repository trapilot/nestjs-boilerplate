import { useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import * as authApi from '../api/auth'
import { Button, Card, FormField, Input } from '../components/ui'
import { PageHeader } from '../components/PageHeader'
import { useUser } from '../contexts/UserContext'
import { ApiError } from '../lib/apiError'

export default function ProfilePage() {
  const { t } = useTranslation('common')
  const { user, refreshProfile } = useUser()
  const [profile, setProfile] = useState({
    name: String(user?.name ?? ''),
    email: String(user?.email ?? ''),
    phone: String(user?.phone ?? ''),
    address: String(user?.address ?? ''),
  })
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})
  const [savingProfile, setSavingProfile] = useState(false)

  const [pwd, setPwd] = useState({ oldPassword: '', newPassword: '', confirm: '' })
  const [pwdErrors, setPwdErrors] = useState<Record<string, string>>({})
  const [savingPwd, setSavingPwd] = useState(false)

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileErrors({})
    setSavingProfile(true)
    try {
      await authApi.editProfile({ ...profile, isActive: true })
      await refreshProfile()
      toast.success(t('saved', { defaultValue: 'Saved' }))
    } catch (err) {
      const apiErr = ApiError.fromUnknown(err)
      setProfileErrors(apiErr.getErrors())
      apiErr.showError()
    } finally {
      setSavingProfile(false)
    }
  }

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdErrors({})
    if (pwd.newPassword !== pwd.confirm) {
      setPwdErrors({ confirm: t('passwordMismatch', { defaultValue: 'Passwords do not match' }) })
      return
    }
    setSavingPwd(true)
    try {
      await authApi.changePassword({ oldPassword: pwd.oldPassword, newPassword: pwd.newPassword })
      setPwd({ oldPassword: '', newPassword: '', confirm: '' })
      toast.success(t('passwordChanged', { defaultValue: 'Password changed' }))
    } catch (err) {
      const apiErr = ApiError.fromUnknown(err)
      setPwdErrors(apiErr.getErrors())
      apiErr.showError()
    } finally {
      setSavingPwd(false)
    }
  }

  return (
    <>
      <PageHeader title={t('profile', { defaultValue: 'Profile' })} />
      <div className="stack">
        <form onSubmit={saveProfile}>
          <Card
            title={t('editProfile', { defaultValue: 'Edit profile' })}
            footer={
              <Button type="submit" variant="primary" loading={savingProfile}>
                {t('save', { defaultValue: 'Save' })}
              </Button>
            }
          >
            <div className="form-grid">
              {(['name', 'email', 'phone', 'address'] as const).map((key) => (
                <FormField
                  key={key}
                  label={t(`field_${key}`, {
                    defaultValue: key.charAt(0).toUpperCase() + key.slice(1),
                  })}
                  htmlFor={`p-${key}`}
                  required={key !== 'phone'}
                  error={profileErrors[key]}
                >
                  <Input
                    id={`p-${key}`}
                    type={key === 'email' ? 'email' : 'text'}
                    invalid={!!profileErrors[key]}
                    value={profile[key]}
                    onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
                  />
                </FormField>
              ))}
            </div>
          </Card>
        </form>

        <form onSubmit={savePassword}>
          <Card
            title={t('changePassword', { defaultValue: 'Change password' })}
            footer={
              <Button type="submit" variant="primary" loading={savingPwd}>
                {t('changePassword', { defaultValue: 'Change password' })}
              </Button>
            }
          >
            <div className="form-grid">
              <FormField
                label={t('oldPassword', { defaultValue: 'Current password' })}
                htmlFor="p-old"
                required
                error={pwdErrors.oldPassword}
              >
                <Input
                  id="p-old"
                  type="password"
                  autoComplete="current-password"
                  required
                  invalid={!!pwdErrors.oldPassword}
                  value={pwd.oldPassword}
                  onChange={(e) => setPwd((p) => ({ ...p, oldPassword: e.target.value }))}
                />
              </FormField>
              <span />
              <FormField
                label={t('newPassword', { defaultValue: 'New password' })}
                htmlFor="p-new"
                required
                error={pwdErrors.newPassword}
              >
                <Input
                  id="p-new"
                  type="password"
                  autoComplete="new-password"
                  required
                  invalid={!!pwdErrors.newPassword}
                  value={pwd.newPassword}
                  onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))}
                />
              </FormField>
              <FormField
                label={t('confirmPassword', { defaultValue: 'Confirm new password' })}
                htmlFor="p-confirm"
                required
                error={pwdErrors.confirm}
              >
                <Input
                  id="p-confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  invalid={!!pwdErrors.confirm}
                  value={pwd.confirm}
                  onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
                />
              </FormField>
            </div>
          </Card>
        </form>
      </div>
    </>
  )
}
