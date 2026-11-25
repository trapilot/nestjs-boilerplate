import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, FormField, Input } from '../components/ui'
import { useUser } from '../contexts/UserContext'
import { ApiError } from '../lib/apiError'

export default function Login() {
  const navigate = useNavigate()
  const { t } = useTranslation('common')
  const { login, loading, error } = useUser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleLoggedIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: unknown) {
      const apiErr = ApiError.fromUnknown(err)
      setFieldErrors(apiErr.getErrors())
      apiErr.showError()
    }
  }

  return (
    <div className="auth-page">
      <form onSubmit={handleLoggedIn} className="card auth-card stack">
        <div className="auth-brand">
          <span className="brand-mark">N</span>
          <h1 className="card-title">{t('welcome', { defaultValue: 'Welcome to Nest Admin' })}</h1>
          <p className="muted">{t('signInHint', { defaultValue: 'Sign in to continue' })}</p>
        </div>
        <FormField
          label={t('email', { defaultValue: 'Email' })}
          htmlFor="login-email"
          error={fieldErrors.email}
        >
          <Input
            id="login-email"
            type="email"
            autoComplete="username"
            value={email}
            invalid={!!fieldErrors.email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </FormField>
        <FormField
          label={t('password', { defaultValue: 'Password' })}
          htmlFor="login-password"
          error={fieldErrors.password}
        >
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            invalid={!!fieldErrors.password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </FormField>
        {error ? <p className="field-error">{error}</p> : null}
        <Button type="submit" variant="primary" size="lg" loading={loading}>
          {t('login', { defaultValue: 'Log in' })}
        </Button>
      </form>
    </div>
  )
}
