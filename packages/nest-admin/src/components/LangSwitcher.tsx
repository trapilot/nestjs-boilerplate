import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n'

export function LangSwitcher() {
  const { i18n } = useTranslation()

  const changeLanguage = async (lng: string) => {
    try {
      localStorage.setItem('language', lng)
      await i18n.changeLanguage(lng)
      window.location.reload()
    } catch (err: unknown) {
      console.error('Failed to change language', err)
    }
  }

  const current = (i18n.language || LANGUAGES[0]).split('-')[0]

  return (
    <div className="lang-switch" role="group" aria-label="Language">
      {LANGUAGES.map((lng) => (
        <button
          key={lng}
          type="button"
          className={current === lng ? 'is-active' : ''}
          onClick={() => changeLanguage(lng)}
          disabled={current === lng}
        >
          {lng.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
