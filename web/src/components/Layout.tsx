import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { setLanguage } from '../i18n'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-soft text-brand-strong' : 'text-muted hover:text-ink'
  }`

export function Layout() {
  const { t, i18n } = useTranslation()
  const other = i18n.language === 'en' ? 'hr' : 'en'

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold text-ink">
            <img src="/favicon.svg" alt="" width={28} height={28} />
            <span className="text-lg">{t('appName')}</span>
          </Link>
          <nav aria-label="Main" className="order-3 flex w-full gap-1 overflow-x-auto sm:order-2 sm:w-auto">
            <NavLink to="/" end className={navClass}>
              {t('nav.calculator')}
            </NavLink>
            <NavLink to="/opcine" className={navClass}>
              {t('nav.municipalities')}
            </NavLink>
            <NavLink to="/o-podacima" className={navClass}>
              {t('nav.about')}
            </NavLink>
          </nav>
          <button
            type="button"
            onClick={() => setLanguage(other)}
            aria-label={t('languageLabel')}
            lang={other}
            className="order-2 ml-auto rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:text-ink sm:order-3"
          >
            {t('language')}
          </button>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-line">
        <p className="mx-auto max-w-5xl px-4 py-5 text-sm text-muted">{t('footer')}</p>
      </footer>
    </div>
  )
}
