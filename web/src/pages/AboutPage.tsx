import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import { Card, ErrorBox, Loading } from '../components/ui'
import { bytes, date, num, percent } from '../lib/format'

export function AboutPage() {
  const { t } = useTranslation()
  const sources = useQuery({ queryKey: ['sources'], queryFn: api.sources })
  const v = sources.data?.validation
  const limits = t('about.limits', { returnObjects: true }) as string[]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{t('about.title')}</h1>
        <p className="mt-2 max-w-2xl text-muted">{t('about.intro')}</p>
      </div>
      {sources.isLoading && <Loading />}
      {sources.isError && <ErrorBox error={sources.error} />}

      {v && (
        <div className="grid gap-5 sm:grid-cols-3">
          <Card>
            <p className="tabular text-3xl font-semibold">{num(v.stats.addresses)}</p>
            <p className="text-muted">{t('about.addresses')}</p>
          </Card>
          <Card>
            <p className="tabular text-3xl font-semibold">
              {percent(v.stats.addresses_resolved / v.stats.addresses)}
            </p>
            <p className="text-muted">{t('about.resolved')}</p>
          </Card>
          <Card>
            <p className="tabular text-3xl font-semibold">
              {sources.data?.build.built_at ? date(sources.data.build.built_at) : '–'}
            </p>
            <p className="text-muted">{t('about.built')}</p>
          </Card>
        </div>
      )}

      {v && (
        <Card>
          <h2 className="text-lg font-semibold">{t('about.checksTitle')}</h2>
          <ul className="mt-3 space-y-1.5">
            {v.checks.map((c) => (
              <li key={c.check} className="flex items-start gap-2">
                <span className={c.ok ? 'text-ok' : 'text-bad'} aria-hidden="true">
                  {c.ok ? '✓' : '✗'}
                </span>
                <span>
                  {t(`checks.${c.check}`, { defaultValue: c.check })}
                  <span className="sr-only"> – {c.ok ? t('about.passed') : t('about.failed')}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {sources.data && (
        <Card>
          <h2 className="text-lg font-semibold">{t('about.datasetsTitle')}</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted">
                <tr>
                  <th className="py-1 pr-3 font-medium">{t('about.dataset')}</th>
                  <th className="py-1 pr-3 font-medium">{t('about.publisher')}</th>
                  <th className="py-1 pr-3 font-medium">{t('about.licence')}</th>
                  <th className="py-1 pr-3 text-right font-medium">{t('about.size')}</th>
                  <th className="py-1 font-medium">{t('about.downloaded')}</th>
                </tr>
              </thead>
              <tbody>
                {sources.data.datasets.map((d) => (
                  <tr key={d.key} className="border-t border-line align-top">
                    <td className="py-1.5 pr-3">
                      <a href={d.url} className="text-brand underline" target="_blank" rel="noreferrer">
                        {t(`datasets.${d.key}`, { defaultValue: d.title })}
                      </a>
                      <span className="block text-xs text-muted">{d.title}</span>
                    </td>
                    <td className="py-1.5 pr-3">{d.publisher}</td>
                    <td className="py-1.5 pr-3">{d.licence}</td>
                    <td className="tabular py-1.5 pr-3 text-right">{bytes(d.bytes)}</td>
                    <td className="py-1.5">{date(d.downloaded_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-semibold">{t('about.limitsTitle')}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {limits.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p className="mt-4">
          <a href="/api/docs" className="text-brand underline">
            {t('about.api')}
          </a>
        </p>
      </Card>
    </div>
  )
}
