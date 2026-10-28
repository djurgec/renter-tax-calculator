import { useQuery } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { PausalRule, PropertyTaxRate } from '../api/types'
import { LegalRangeBar } from '../components/LegalRangeBar'
import { Badge, Card, ErrorBox, Loading } from '../components/ui'
import { eur, num, percent } from '../lib/format'
import { describeRule } from '../lib/rules'

const RULES_SHOWN = 100

function propertyRate(r: PropertyTaxRate | null) {
  if (!r || r.rate_min == null) return '–'
  return r.is_range ? `${eur(r.rate_min)} – ${eur(r.rate_max)}` : eur(r.rate_min)
}

export function MunicipalityPage() {
  const { t } = useTranslation()
  const code = Number(useParams().code)
  const detail = useQuery({ queryKey: ['municipality', code], queryFn: () => api.municipality(code) })
  const neighbours = useQuery({ queryKey: ['neighbours', code], queryFn: () => api.neighbours(code) })

  if (detail.isLoading) return <Loading />
  if (detail.error instanceof ApiError && detail.error.status === 404) return <p>{t('muni.notFound')}</p>
  if (detail.isError || !detail.data) return <ErrorBox error={detail.error} />
  const m = detail.data
  const wide = m.pausal_rules.filter((r) => r.level === 'municipality')
  const wideRate = wide.length === 1 ? wide[0].rates.bed : null

  return (
    <div className="space-y-5">
      <div>
        <Link to="/opcine" className="text-sm text-brand underline">
          ← {t('muni.back')}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{m.name}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-muted">
          {m.county}
          <Badge tone="brand">
            {m.tourism_category ? t('muni.category', { category: m.tourism_category }) : t('muni.noCategory')}
          </Badge>
        </p>
        {m.pausal_source_ambiguous && <p className="mt-2 text-warn-text">{t('muni.ambiguous')}</p>}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">{t('muni.taxesTitle')}</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="tabular w-full text-sm">
              <thead className="text-left text-muted">
                <tr>
                  <th className="py-1 pr-3 font-medium">{t('muni.year')}</th>
                  <th className="py-1 pr-3 font-medium">{t('muni.propertyTax')}</th>
                  <th className="py-1 pr-3 font-medium">{t('muni.incomeTax')}</th>
                  <th className="py-1 font-medium">{t('muni.consumptionTax')}</th>
                </tr>
              </thead>
              <tbody>
                {m.years.map((y) => (
                  <tr key={y.year} className="border-t border-line">
                    <td className="py-1.5 pr-3">{y.year}.</td>
                    <td className="py-1.5 pr-3">{propertyRate(y.property_tax)}</td>
                    <td className="py-1.5 pr-3">
                      {percent(y.income_tax_lower)} / {percent(y.income_tax_higher)}
                    </td>
                    <td className="py-1.5">{percent(y.consumption_tax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {m.legal_range && <LegalRangeBar range={m.legal_range} rate={wideRate} />}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">{t('muni.neighboursTitle')}</h2>
          {neighbours.isError && <ErrorBox error={neighbours.error} />}
          <div className="mt-3 overflow-x-auto">
            <table className="tabular w-full text-sm">
              <thead className="text-left text-muted">
                <tr>
                  <th className="py-1 pr-3 font-medium" />
                  <th className="py-1 pr-3 font-medium">{t('muni.distance')}</th>
                  <th className="py-1 pr-3 font-medium">{t('muni.perBed')}</th>
                  <th className="py-1 font-medium">{t('muni.propertyTax')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-line font-medium">
                  <td className="py-1.5 pr-3">{m.name}</td>
                  <td className="py-1.5 pr-3">–</td>
                  <td className="py-1.5 pr-3">{wideRate != null ? eur(wideRate) : t('muni.variesBy')}</td>
                  <td className="py-1.5">{propertyRate(m.years.at(-1)?.property_tax ?? null)}</td>
                </tr>
                {neighbours.data?.map((n) => (
                  <tr key={n.code} className="border-t border-line">
                    <td className="py-1.5 pr-3">
                      <Link to={`/opcine/${n.code}`} className="text-brand underline">
                        {n.name}
                      </Link>
                    </td>
                    <td className="py-1.5 pr-3">{num(n.distance_km)} km</td>
                    <td className="py-1.5 pr-3">
                      {n.pausal_rate_bed != null ? eur(n.pausal_rate_bed) : t('muni.variesBy')}
                    </td>
                    <td className="py-1.5">{propertyRate(n.property_tax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <RulesTable rules={m.pausal_rules} />
    </div>
  )
}

function RulesTable({ rules }: { rules: PausalRule[] }) {
  const { t } = useTranslation()
  const id = useId()
  const [filter, setFilter] = useState('')
  const f = filter.trim().toLowerCase()
  const shown = rules.filter((r) =>
    `${r.settlement ?? ''} ${r.street ?? ''}`.toLowerCase().includes(f),
  )

  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t('muni.rulesTitle', { year: 2026 })}</h2>
          <p className="text-sm text-muted">{t('muni.rulesCount', { count: rules.length })}</p>
        </div>
        {rules.length > 10 && (
          <div>
            <label htmlFor={id} className="block text-sm font-medium">
              {t('muni.filterRules')}
            </label>
            <input
              id={id}
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="mt-1 rounded-md border border-line bg-surface px-2 py-1.5"
            />
          </div>
        )}
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="tabular w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-1 pr-3 font-medium">{t('muni.where')}</th>
              <th className="py-1 pr-3 text-right font-medium">{t('muni.perBed')}</th>
              <th className="py-1 pr-3 text-right font-medium">{t('muni.perCamp')}</th>
              <th className="py-1 pr-3 text-right font-medium">{t('muni.perRobinson')}</th>
              <th className="py-1 text-right font-medium">{t('muni.source')}</th>
            </tr>
          </thead>
          <tbody>
            {shown.slice(0, RULES_SHOWN).map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="py-1.5 pr-3">
                  {r.level === 'municipality' ? t('muni.everywhere') : describeRule(r, t)}
                  {r.level !== 'municipality' && r.settlement && r.level !== 'settlement' && (
                    <span className="text-muted"> · {r.settlement}</span>
                  )}
                </td>
                <td className="py-1.5 pr-3 text-right">{eur(r.rates.bed)}</td>
                <td className="py-1.5 pr-3 text-right">{eur(r.rates.camp_unit)}</td>
                <td className="py-1.5 pr-3 text-right">{eur(r.rates.robinson_unit)}</td>
                <td className="py-1.5 text-right text-muted">{r.source_row}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length > RULES_SHOWN && (
        <p className="mt-2 text-sm text-muted">{t('search.more', { count: shown.length - RULES_SHOWN })}</p>
      )}
    </Card>
  )
}
