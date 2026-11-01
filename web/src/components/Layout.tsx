import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { setLanguage } from '../i18n'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `relative whitespace-nowrap py-2 font-medium transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors ${
    isActive ? 'text-on-brand after:bg-fix' : 'text-on-brand-muted after:bg-transparent hover:text-on-brand'
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
      <header className="bg-brand text-on-brand">
        <div className="mx-auto flex max-w-[90rem] flex-wrap items-center gap-x-10 gap-y-1 px-4 pt-3 sm:px-8 sm:py-3.5">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" width={30} height={30} />
            <span className="display text-[1.4rem] font-semibold">{t('appName')}</span>
          </Link>
          <nav aria-label="Main" className="order-3 flex w-full gap-7 overflow-x-auto sm:order-2 sm:w-auto">
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
            className="press order-2 ml-auto rounded-full border border-on-brand-muted/50 px-4 py-1.5 text-[0.95rem] text-on-brand hover:border-on-brand sm:order-3"
          >
            {t('language')}
          </button>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-[90rem] flex-1 px-4 pb-24 pt-6 sm:px-8 sm:pt-8 lg:pb-12">
        <Outlet />
      </main>

      <footer className="bg-brand text-on-brand-muted">
        <div className="mx-auto flex max-w-[90rem] flex-col gap-2 px-4 py-7 sm:flex-row sm:items-baseline sm:gap-10 sm:px-8">
          <p className="display shrink-0 text-lg font-semibold text-on-brand">{t('appName')}</p>
          <p className="max-w-3xl text-sm leading-relaxed">
            {t('footer')} {t('mapCredit')}
          </p>
        </div>
      </footer>
    </div>
  )
}
