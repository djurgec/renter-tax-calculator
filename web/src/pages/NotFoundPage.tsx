import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div>
      <p className="display text-[2.2rem]">{t('notFound')}</p>
      <Link to="/" className="mt-4 inline-block font-semibold underline">
        {t('nav.calculator')}
      </Link>
    </div>
  )
}
