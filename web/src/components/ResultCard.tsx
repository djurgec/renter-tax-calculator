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
  const total = eurRange(result.total_min, result.total_max)

  return (
    <Card className={`transition-opacity duration-200 ${stale ? 'opacity-60' : ''}`}>
      {/* The bottom line of a tax decision: label, dotted leader, amount. */}
      <div
        aria-live="polite"
        className="-mx-5 -mt-5 flex flex-wrap items-end gap-x-3 gap-y-1 rounded-t-2xl bg-surface-2 px-5 pb-5 pt-6 sm:-mx-7 sm:-mt-7 sm:px-7"
      >
        <h2 className="pb-1 text-lg font-semibold">{t('result.total')}</h2>
        <Leader className="mb-2.5 self-end" />
        <p
          key={total}
          className="display settle tabular ml-auto text-[2.25rem] leading-none sm:text-[2.6rem]"
        >
          {total}
        </p>
      </div>

      <section className="mt-6">
        <div className="flex items-baseline gap-3">
          <h3 className="font-semibold">{t('result.pausal')}</h3>
          <Leader />
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

      <section className="mt-7">
        <div className="flex items-baseline gap-3">
          <h3 className="font-semibold">{t('result.propertyTax')}</h3>
          <Leader />
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
        <section className="mt-6 rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn-text">
          <h3 className="font-semibold">{t('warnings.title')}</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {result.warnings.map((w) => (
              <li key={w}>{t(`warnings.${w}`, { defaultValue: w })}</li>
            ))}
          </ul>
        </section>
      )}

      <details className="group mt-6 text-sm">
        <summary className="cursor-pointer font-semibold text-brand marker:text-accent">{t('result.howCalculated')}</summary>
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

      <div className="mt-5 flex flex-col gap-2 rounded-xl bg-surface-2/60 px-4 py-3 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <Link to={`/opcine/${result.municipality.code}`} className="shrink-0 font-semibold text-brand underline">
          {t('result.municipalityPage', { name: result.municipality.name })}
        </Link>
        <p className="text-muted">{t('result.disclaimer')}</p>
      </div>
    </Card>
  )
}

/** Dotted leader that runs from a label to its amount, as on a printed tax notice. */
function Leader({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`min-w-4 flex-1 border-b-2 border-dotted border-line-strong ${className}`}
    />
  )
}
