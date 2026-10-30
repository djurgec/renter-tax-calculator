import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { setLanguage } from '../i18n'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `relative whitespace-nowrap px-1 py-2 text-[0.95rem] font-medium transition-colors after:absolute after:inset-x-1 after:-bottom-px after:h-0.5 after:rounded-full after:transition-colors ${
    isActive
      ? 'text-on-shell after:bg-accent'
      : 'text-on-shell-muted after:bg-transparent hover:text-on-shell'
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
      <header className="bg-shell text-on-shell">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-8 gap-y-1 px-4 pt-3 sm:py-3">
          <Link to="/" className="flex items-center gap-2.5 text-on-shell">
            <img src="/favicon.svg" alt="" width={30} height={30} />
            <span className="display text-xl">{t('appName')}</span>
          </Link>
          <nav aria-label="Main" className="order-3 -mx-1 flex w-full gap-5 overflow-x-auto sm:order-2 sm:w-auto">
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
            className="press order-2 ml-auto rounded-full border border-on-shell-muted/50 px-3.5 py-1.5 text-sm text-on-shell hover:border-on-brand hover:bg-white/10 sm:order-3"
          >
            {t('language')}
          </button>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-8 sm:pt-12 lg:pb-16">
        <Outlet />
      </main>

      <footer className="bg-shell-strong text-on-shell-muted">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-start sm:gap-10">
          <p className="display shrink-0 text-lg text-on-shell">{t('appName')}</p>
          <p className="max-w-2xl text-sm leading-relaxed">{t('footer')}</p>
        </div>
      </footer>
    </div>
  )
}
