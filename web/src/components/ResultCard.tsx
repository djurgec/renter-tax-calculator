import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { CalculationResult } from '../api/types'
import { date, eur, eurRange } from '../lib/format'
import { describeRule } from '../lib/rules'
import { LegalRangeBar } from './LegalRangeBar'
import { Card } from './ui'

export function ResultCard({ result, stale }: { result: CalculationResult; stale: boolean }) {
  const { t } = useTranslation()
  const { pausal, property_tax: pt } = result
  const noUnits = pausal.lines.length === 0

  return (
    <Card className={`transition-opacity ${stale ? 'opacity-60' : ''}`}>
      <div aria-live="polite">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">{t('result.total')}</h2>
        <p className="tabular mt-1 text-4xl font-semibold text-ink">
          {eurRange(result.total_min, result.total_max)}
        </p>
      </div>

      <section className="mt-5 border-t border-line pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-semibold">{t('result.pausal')}</h3>
          <span className="tabular font-semibold">
            {pausal.alternatives.length > 0
              ? eurRange(
                  Math.min(pausal.amount ?? 0, ...pausal.alternatives.map((a) => a.amount)),
                  Math.max(pausal.amount ?? 0, ...pausal.alternatives.map((a) => a.amount)),
                )
              : eur(pausal.amount)}
          </span>
        </div>
        {pausal.rule ? (
          <>
            <p className="mt-1 text-sm text-muted">{describeRule(pausal.rule, t)}</p>
            {noUnits ? (
              <p className="mt-2 text-sm text-muted">{t('result.noUnits')}</p>
            ) : (
              <ul className="tabular mt-2 space-y-0.5 text-sm">
                {pausal.lines.map((l) => (
                  <li key={l.unit} className="flex justify-between gap-3">
                    <span>
                      {t('result.perUnit', { count: l.count, rate: l.rate != null ? eur(l.rate) : '?' })}{' '}
                      <span className="text-muted">({t(`units.${l.unit}`)})</span>
                    </span>
                    <span>{l.amount != null ? eur(l.amount) : t('result.rateMissing')}</span>
                  </li>
                ))}
              </ul>
            )}
            {pausal.alternatives.length > 0 && (
              <p className="mt-2 text-sm">
                {t('result.alternatives')}{' '}
                {pausal.alternatives.map((a) => `${eur(a.rule.rates.bed)} / ${t('units.bed')}`).join(', ')}
              </p>
            )}
            {pausal.legal_range && (
              <LegalRangeBar range={pausal.legal_range} rate={pausal.rule.rates.bed} />
            )}
          </>
        ) : (
          <p className="mt-1 text-sm">{t('result.noRule')}</p>
        )}
      </section>

      <section className="mt-5 border-t border-line pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-semibold">{t('result.propertyTax')}</h3>
          <span className="tabular font-semibold">{eurRange(pt.amount_min, pt.amount_max)}</span>
        </div>
        <div className="mt-1 space-y-0.5 text-sm text-muted">
          {pt.exempt ? (
            <p>{t('result.exempt')}</p>
          ) : pt.rate?.rate_min == null ? (
            <p>{t('result.noRate')}</p>
          ) : (
            <>
              <p>
                {pt.rate.is_range
                  ? t('result.zoneRange', { min: eur(pt.rate.rate_min), max: eur(pt.rate.rate_max) })
                  : t('result.rate', { rate: eur(pt.rate.rate_min) })}
                {pt.area_m2 == null && <> · {t('result.enterArea')}</>}
              </p>
              {pt.previous?.raw && pt.previous.raw !== pt.rate.raw && (
                <p>{t('result.previous', { year: pt.previous.year, raw: pt.previous.raw })}</p>
              )}
            </>
          )}
          {pt.rate?.administered_by && <p>{t(`result.billedBy.${pt.rate.administered_by}`)}</p>}
        </div>
      </section>

      {result.warnings.length > 0 && (
        <section className="mt-5 rounded-lg border border-warn-line bg-warn-bg p-3 text-sm text-warn-text">
          <h3 className="font-semibold">{t('warnings.title')}</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {result.warnings.map((w) => (
              <li key={w}>{t(`warnings.${w}`, { defaultValue: w })}</li>
            ))}
          </ul>
        </section>
      )}

      <details className="mt-5 border-t border-line pt-4 text-sm">
        <summary className="cursor-pointer font-medium text-brand">{t('result.howCalculated')}</summary>
        <ul className="mt-2 space-y-2">
          {result.provenance.map((p) => (
            <li key={p.dataset}>
              <a href={p.url} className="text-brand underline" target="_blank" rel="noreferrer">
                {t(`datasets.${p.dataset}`, { defaultValue: p.title })}
              </a>
              <span className="text-muted">
                {' '}
                · {p.publisher}
                {p.source_row != null && <> · {t('result.row', { row: p.source_row })}</>} ·{' '}
                {t('result.downloaded', { date: date(p.downloaded_at) })}
              </span>
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-4 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <Link to={`/opcine/${result.municipality.code}`} className="text-brand underline">
          {t('result.municipalityPage', { name: result.municipality.name })}
        </Link>
        <p className="text-muted">{t('result.disclaimer')}</p>
      </div>
    </Card>
  )
}
