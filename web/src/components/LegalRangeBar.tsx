import { useTranslation } from 'react-i18next'
import type { LegalRange } from '../api/types'
import { eur } from '../lib/format'

/** Where the municipality's per-bed rate sits inside the legal range of its category. */
export function LegalRangeBar({ range, rate }: { range: LegalRange; rate: number | null }) {
  const { t } = useTranslation()
  const span = range.max_amount - range.min_amount
  const pos = (v: number) => `${Math.min(100, Math.max(0, ((v - range.min_amount) / span) * 100))}%`
  const summary = `${t('result.legalRange', { category: range.category })}: ${eur(range.min_amount)} – ${eur(range.max_amount)}, ${t('result.defaultAmount', { amount: eur(range.default_amount) })}${rate != null ? `, ${t('result.yourRate')} ${eur(rate)}` : ''}`

  return (
    <figure className="mt-3" aria-label={summary}>
      <figcaption className="mb-1 text-sm text-muted" title={t('result.legalRangeHelp')}>
        {t('result.legalRange', { category: range.category })}
      </figcaption>
      <div className="relative h-7" aria-hidden="true">
        <div className="absolute inset-x-0 top-[11px] h-1.5 rounded-full bg-surface-2" />
        {rate != null && (
          <div
            className="absolute top-[11px] h-1.5 rounded-full bg-accent-soft"
            style={{ left: 0, width: pos(rate) }}
          />
        )}
        <div
          className="absolute top-1.5 h-4 w-0.5 -translate-x-1/2 rounded-full bg-line-strong"
          style={{ left: pos(range.default_amount) }}
          title={t('result.defaultAmount', { amount: eur(range.default_amount) })}
        />
        {rate != null && (
          <div
            className="absolute top-1 h-[18px] w-[18px] -translate-x-1/2 rounded-full border-[3px] border-surface bg-accent shadow-[0_1px_3px_rgb(0_0_0/0.25)]"
            style={{ left: pos(rate) }}
          />
        )}
      </div>
      <div className="tabular flex justify-between text-xs text-muted" aria-hidden="true">
        <span>{eur(range.min_amount)}</span>
        <span>{t('result.defaultAmount', { amount: eur(range.default_amount) })}</span>
        <span>{eur(range.max_amount)}</span>
      </div>
    </figure>
  )
}
