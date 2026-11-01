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
  const category = pausal.legal_range?.category ?? pausal.rule?.category

  return (
    <Card className={`transition-opacity duration-200 ${stale ? 'opacity-60' : ''}`}>
      <p className="flex items-center gap-2 text-[0.95rem] font-semibold text-fix">
        <FixIcon />
        <span>
          {result.municipality.name}
          {category && <> · {t('muni.category', { category })}</>}
        </span>
      </p>

      <div aria-live="polite" className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 border-b border-line pb-4">
        <h2 className="text-lg font-semibold">{t('result.total')}</h2>
        <p key={total} className="display settle tabular text-[2.4rem] leading-tight sm:text-[2.9rem]">
          {total}
        </p>
      </div>

      <section className="mt-4">
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
            <p className="mt-0.5 text-[0.95rem] text-muted">
              {describeRule(pausal.rule, t)} · {t('result.row', { row: pausal.rule.source_row })}
            </p>
            {noUnits ? (
              <p className="mt-2 text-[0.95rem] text-muted">{t('result.noUnits')}</p>
            ) : (
              <ul className="tabular mt-2 space-y-0.5 text-[0.95rem]">
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
              <p className="mt-2 text-[0.95rem]">
                {t('result.alternatives')}{' '}
                {pausal.alternatives.map((a) => `${eur(a.rule.rates.bed)} / ${t('units.bed')}`).join(', ')}
              </p>
            )}
            {pausal.legal_range && <LegalRangeBar range={pausal.legal_range} rate={pausal.rule.rates.bed} />}
          </>
        ) : (
          <p className="mt-1 text-[0.95rem]">{t('result.noRule')}</p>
        )}
      </section>

      <section className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-semibold">{t('result.propertyTax')}</h3>
          <span className="tabular font-semibold">{eurRange(pt.amount_min, pt.amount_max)}</span>
        </div>
        <div className="mt-0.5 space-y-0.5 text-[0.95rem] text-muted">
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
        <section className="mt-5 rounded-xl bg-warn-bg px-4 py-3 text-[0.95rem] text-warn-text">
          <h3 className="font-semibold">{t('warnings.title')}</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {result.warnings.map((w) => (
              <li key={w}>{t(`warnings.${w}`, { defaultValue: w })}</li>
            ))}
          </ul>
        </section>
      )}

      <details className="mt-5 border-t border-line pt-3.5 text-[0.95rem]">
        <summary className="cursor-pointer font-semibold marker:text-fix">{t('result.howCalculated')}</summary>
        <ul className="mt-2 space-y-2">
          {result.provenance.map((p) => (
            <li key={p.dataset}>
              <a href={p.url} className="font-medium underline" target="_blank" rel="noreferrer">
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

      <div className="mt-4 flex flex-col gap-1.5 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <Link to={`/opcine/${result.municipality.code}`} className="shrink-0 font-semibold underline">
          {t('result.municipalityPage', { name: result.municipality.name })}
        </Link>
        <p className="text-muted sm:text-right">{t('result.disclaimer')}</p>
      </div>
    </Card>
  )
}

export function FixIcon({ className = 'h-[1.1rem] w-[1.1rem]' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" className={`shrink-0 ${className}`}>
      <circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="9" cy="9" r="2.2" fill="currentColor" />
    </svg>
  )
}
