import { useQuery } from '@tanstack/react-query'
import { useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { ChartMap } from '../components/ChartMap'
import { ErrorBox, Loading } from '../components/ui'
import { rateClass } from '../lib/chart'
import { eur } from '../lib/format'

const fold = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/gi, 'd').toLowerCase()

export function MunicipalityListPage() {
  const { t } = useTranslation()
  const id = useId()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('')
  const [hover, setHover] = useState<number | null>(null)
  const list = useQuery({ queryKey: ['municipalities'], queryFn: api.municipalities })
  const points = useQuery({ queryKey: ['map'], queryFn: api.map })
  const byCode = useMemo(() => new Map((points.data ?? []).map((p) => [p.code, p])), [points.data])
  const f = fold(filter.trim())
  const shown = (list.data ?? []).filter((m) => fold(`${m.name} ${m.county ?? ''}`).includes(f))
  const shownCodes = new Set(shown.map((m) => m.code))

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 [grid-template-areas:'head'_'chart'_'list'] lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-x-8 lg:[grid-template-areas:'head_chart'_'list_chart'] lg:[grid-template-rows:auto_1fr]">
      <div className="[grid-area:head]">
        <h1 className="text-[2rem] leading-[1.1] sm:text-[2.6rem]">{t('muni.listTitle')}</h1>
        {list.data && <p className="mt-2 text-muted">{t('muni.listIntro', { count: list.data.length })}</p>}
        <label htmlFor={id} className="mt-6 block font-semibold">
          {t('muni.filter')}
        </label>
        <input
          id={id}
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="mt-2 h-14 w-full rounded-2xl bg-surface px-5 text-lg shadow-[0_1px_0_var(--line-strong)] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fix"
        />
        {list.isLoading && <Loading />}
        {list.isError && <ErrorBox error={list.error} />}
      </div>
      <div className="[grid-area:list]">
        <ul className="overflow-hidden rounded-[1.25rem] bg-surface lg:max-h-[calc(100vh-24rem)] lg:overflow-y-auto">
          {shown.map((m) => {
            const p = byCode.get(m.code)
            const rate = p?.rate_bed ?? null
            return (
              <li key={m.code} className="border-b border-line last:border-b-0">
                <Link
                  to={`/opcine/${m.code}`}
                  onPointerEnter={() => setHover(m.code)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(m.code)}
                  onBlur={() => setHover(null)}
                  className={`flex items-center gap-3 px-5 py-3 transition-colors hover:bg-brand-soft focus-visible:bg-brand-soft ${
                    hover === m.code ? 'bg-brand-soft' : ''
                  }`}
                >
                  <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3 w-3 shrink-0">
                    <circle
                      cx="6"
                      cy="6"
                      r={rate != null ? 5 : 4}
                      fill={rate != null ? rateClass(rate).fill : 'var(--surface)'}
                      stroke={rate != null ? 'none' : 'var(--rate-3)'}
                      strokeWidth="2.2"
                    />
                  </svg>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{m.name}</span>
                    <span className="block truncate text-sm text-muted">{m.county}</span>
                  </span>
                  <span className="tabular text-right text-sm">
                    {rate != null ? (
                      eur(rate)
                    ) : p?.rate_min != null && p.rate_max != null ? (
                      <span className="text-muted">
                        {eur(p.rate_min)}–{eur(p.rate_max)}
                      </span>
                    ) : null}
                    {m.tourism_category && (
                      <span className="block text-xs text-muted">{t('muni.category', { category: m.tourism_category })}</span>
                    )}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="h-[22rem] [grid-area:chart] sm:h-[28rem] lg:sticky lg:top-6 lg:h-[calc(100vh-8rem)] lg:min-h-[36rem]">
        <ChartMap
          points={(points.data ?? []).filter((p) => !f || shownCodes.has(p.code))}
          error={points.isError}
          highlight={hover}
          highlightTip
          onHover={setHover}
          onOpen={(code) => navigate(`/opcine/${code}`)}
        />
      </div>
    </div>
  )
}
