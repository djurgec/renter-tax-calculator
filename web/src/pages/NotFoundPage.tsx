import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div>
      <p className="text-lg">{t('notFound')}</p>
      <Link to="/" className="mt-2 inline-block text-brand underline">
        {t('nav.calculator')}
      </Link>
    </div>
  )
}
