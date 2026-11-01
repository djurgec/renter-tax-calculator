import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import type { Address, CalculateRequest } from '../api/types'
import { AddressSearch } from '../components/AddressSearch'
import { ChartMap, type Sounding } from '../components/ChartMap'
import { MunicipalityChoice } from '../components/MunicipalityChoice'
import { NumberField } from '../components/NumberField'
import { FixIcon, ResultCard } from '../components/ResultCard'
import { Card, ErrorBox, Loading } from '../components/ui'
import { eurRange } from '../lib/format'
import { useDebounced } from '../lib/useDebounced'
import { useInView } from '../lib/useInView'

const TAX_YEAR = 2026

type Patch = Record<string, string | number | null | boolean>

function fromParams(params: URLSearchParams): Patch {
  return Object.fromEntries(params.entries())
}

/**
 * The inputs are mirrored into the URL (?a=…&b=4&p=80) so a calculation can be shared or
 * bookmarked. React state is the source of truth: the router's copy of the URL updates in
 * a transition, so building on it would drop quick successive edits.
 */
function useCalcParams() {
  const [params, setParams] = useSearchParams()
  const [raw, setRaw] = useState<Patch>(() => fromParams(params))
  // URLs this hook wrote itself; any other URL (nav link, back button) resets the form
  const written = useRef(new Set([params.toString()]))

  useEffect(() => {
    if (!written.current.has(params.toString())) {
      written.current = new Set([params.toString()])
      setRaw(fromParams(params))
    }
  }, [params])

  useEffect(() => {
    const next = new URLSearchParams()
    for (const [k, v] of Object.entries(raw)) {
      if (!(v === null || v === '' || v === 0 || v === false || v === '0')) {
        next.set(k, v === true ? '1' : String(v))
      }
    }
    if (next.toString() !== window.location.search.replace(/^\?/, '')) {
      written.current.add(next.toString())
      setParams(next, { replace: true })
    }
  }, [raw, setParams])

  const int = (k: string) => Math.max(0, Number.parseInt(String(raw[k] ?? '0'), 10) || 0)
  const state = {
    addressId: raw.a ? String(raw.a) : null,
    municipality: raw.m ? Number(raw.m) : null,
    beds: int('b'),
    campUnits: int('k'),
    robinsonUnits: int('r'),
    area: raw.p ? String(raw.p) : '',
    primary: raw.s === true || raw.s === '1',
  }
  const update = useCallback((patch: Patch) => setRaw((prev) => ({ ...prev, ...patch })), [])
  return [state, update] as const
}

export function CalculatorPage() {
  const { t } = useTranslation()
  const [s, update] = useCalcParams()

  const address = useQuery({
    queryKey: ['address', s.addressId],
    queryFn: () => api.address(s.addressId!),
    enabled: !!s.addressId,
  })
  const needsChoice = !!address.data && address.data.municipality == null
  const area = Number.parseFloat(s.area.replace(',', '.'))

  const body = useMemo<CalculateRequest | null>(() => {
    if (!s.addressId || !address.data) return null
    if (needsChoice && s.municipality == null) return null
    return {
      address_id: s.addressId,
      municipality_code: needsChoice ? s.municipality : null,
      beds: s.beds,
      camp_units: s.campUnits,
      robinson_units: s.robinsonUnits,
      area_m2: area > 0 ? area : null,
      is_primary_residence: s.primary,
    }
  }, [s.addressId, address.data, needsChoice, s.municipality, s.beds, s.campUnits, s.robinsonUnits, area, s.primary])
  const debouncedBody = useDebounced(body, 250)

  const calc = useQuery({
    queryKey: ['calculate', debouncedBody],
    queryFn: ({ signal }) => api.calculate(debouncedBody!, signal),
    enabled: debouncedBody != null,
    placeholderData: keepPreviousData,
  })

  const navigate = useNavigate()
  const points = useQuery({ queryKey: ['map'], queryFn: api.map })
  const muniCode = calc.data?.municipality.code ?? address.data?.municipality?.code ?? s.municipality ?? null
  const neighbours = useQuery({
    queryKey: ['neighbours', muniCode],
    queryFn: () => api.neighbours(muniCode!),
    enabled: muniCode != null,
  })
  const byCode = useMemo(() => new Map((points.data ?? []).map((p) => [p.code, p])), [points.data])
  const soundings: Sounding[] = useMemo(
    () =>
      (neighbours.data ?? []).flatMap((n) => {
        const p = byCode.get(n.code)
        return p ? [{ code: n.code, name: n.name, lat: p.lat, lon: p.lon, rate: n.pausal_rate_bed }] : []
      }),
    [neighbours.data, byCode],
  )
  const muniPoint = muniCode != null ? byCode.get(muniCode) : undefined
  const fix =
    address.data?.lat != null && address.data.lon != null
      ? { lat: address.data.lat, lon: address.data.lon, label: address.data.id }
      : muniPoint
        ? { lat: muniPoint.lat, lon: muniPoint.lon, label: `m${muniPoint.code}` }
        : null

  const resultRef = useRef<HTMLDivElement>(null)
  const resultInView = useInView(resultRef, 96)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 [grid-template-areas:'head'_'chart'_'form'_'result'] lg:grid-cols-[minmax(0,35rem)_minmax(0,1fr)] lg:gap-x-8 lg:gap-y-5 lg:[grid-template-areas:'head_chart'_'form_chart'_'result_chart'] lg:[grid-template-rows:auto_auto_1fr]">
      <div className="space-y-5 [grid-area:head]">
        <div>
          <h1 className="text-[2rem] leading-[1.08] sm:text-[2.5rem]">{t('calc.title')}</h1>
          <p className="mt-2.5 max-w-xl text-[0.98rem] text-muted">{t('calc.intro', { year: TAX_YEAR })}</p>
        </div>
        {!s.addressId ? (
          <AddressSearch onSelect={(id) => update({ a: id, m: null })} />
        ) : address.isLoading ? (
          <Card>
            <Loading />
          </Card>
        ) : address.isError ? (
          <Card>
            <ErrorBox error={address.error} />
            <ChangeButton onClick={() => update({ a: null, m: null })} />
          </Card>
        ) : (
          address.data && (
            <SelectedAddress
              address={address.data}
              municipality={s.municipality}
              onMunicipality={(m) => update({ m })}
              onChange={() => update({ a: null, m: null })}
            />
          )
        )}
      </div>

      <div className="[grid-area:chart]">
        <div className="h-[23rem] sm:h-[30rem] lg:sticky lg:top-6 lg:h-[calc(100vh-8rem)] lg:min-h-[38rem]">
          <ChartMap
            points={points.data ?? []}
            error={points.isError}
            fix={fix}
            soundings={soundings}
            highlight={muniCode}
            onOpen={(code) => navigate(`/opcine/${code}`)}
          />
        </div>
      </div>

      <section aria-labelledby="form-title" className="[grid-area:form]">
        <h2 id="form-title" className="sr-only">
          {t('form.title')}
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          <NumberField label={t('form.beds')} help={t('form.bedsHelp')} value={s.beds} onChange={(v) => update({ b: v })} />
          <NumberField label={t('form.campUnits')} help={t('form.campHelp')} value={s.campUnits} onChange={(v) => update({ k: v })} />
          <NumberField label={t('form.robinson')} help={t('form.robinsonHelp')} value={s.robinsonUnits} onChange={(v) => update({ r: v })} />
          <AreaField value={s.area} onChange={(v) => update({ p: v })} />
        </div>
        <label className="mt-2.5 flex cursor-pointer items-start gap-3 rounded-2xl bg-surface/65 px-4 py-3 transition-colors hover:bg-surface">
          <input
            type="checkbox"
            checked={s.primary}
            onChange={(e) => update({ s: e.target.checked })}
            className="mt-0.5 h-5 w-5 shrink-0"
          />
          <span>
            <span className="font-semibold">{t('form.primary')}</span>
            <span className="block text-[0.85rem] text-muted">{t('form.primaryHelp')}</span>
          </span>
        </label>
      </section>

      <div ref={resultRef} className="scroll-mt-4 [grid-area:result]">
        {calc.data && debouncedBody ? (
          <ResultCard result={calc.data} stale={calc.isFetching} />
        ) : calc.isError ? (
          <Card>
            <ErrorBox error={calc.error} />
          </Card>
        ) : (
          <Card className="bg-surface/65">
            <h2 className="display text-[1.6rem]">{t('result.title')}</h2>
            <p className="mt-1 text-muted">{calc.isFetching ? t('loading') : t('result.empty')}</p>
          </Card>
        )}
      </div>

      {calc.data && debouncedBody && (
        <MobileTotal
          amount={eurRange(calc.data.total_min, calc.data.total_max)}
          hidden={resultInView}
          onShow={() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        />
      )}
    </div>
  )
}

function SelectedAddress({
  address,
  municipality,
  onMunicipality,
  onChange,
}: {
  address: Address
  municipality: number | null
  onMunicipality: (code: number) => void
  onChange: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-2xl bg-surface px-5 py-3.5">
        <span className="text-fix">
          <FixIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 basis-[calc(100%-3rem)] sm:basis-0">
          <p className="sr-only">{t('search.label')}</p>
          <p className="text-[1.15rem] font-semibold leading-snug sm:truncate">{address.label}</p>
          {address.municipality && (
            <p className="text-sm text-muted">
              {t('address.municipality')}: {address.municipality.name}, {address.municipality.county}
            </p>
          )}
        </div>
        <ChangeButton onClick={onChange} />
      </div>
      {address.municipality == null && (
        <MunicipalityChoice address={address} value={municipality} onChange={onMunicipality} />
      )}
    </div>
  )
}

function ChangeButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onClick}
      className="press shrink-0 rounded-full border border-line-strong px-3.5 py-1.5 text-sm font-semibold hover:border-fix hover:text-fix"
    >
      {t('search.change')}
    </button>
  )
}

function AreaField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div className="flex flex-col rounded-2xl bg-surface/65 px-4 pb-2.5 pt-2.5 transition-colors focus-within:bg-surface">
      <label htmlFor={id} className="text-[0.92rem] font-semibold">
        {t('form.area')}
      </label>
      <p id={`${id}-help`} className="text-[0.8rem] leading-snug text-muted">
        {t('form.areaHelp')}
      </p>
      <div className="mt-auto flex items-baseline gap-1.5 pt-1.5">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          placeholder="–"
          aria-describedby={`${id}-help`}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, '').slice(0, 8))}
          className="tabular w-full min-w-0 bg-transparent text-[1.6rem] font-semibold leading-none placeholder:text-muted/60 focus:outline-none"
        />
        <span className="text-muted">m²</span>
      </div>
    </div>
  )
}

/** Phones only: the total stays in reach while the form is filled in. */
function MobileTotal({ amount, hidden, onShow }: { amount: string; hidden: boolean; onShow: () => void }) {
  const { t } = useTranslation()
  return (
    <div
      className="sticky-total fixed inset-x-0 bottom-0 z-[1100] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
      data-hidden={hidden}
      aria-hidden={hidden}
    >
      <button
        type="button"
        onClick={onShow}
        tabIndex={hidden ? -1 : 0}
        className="press flex w-full items-center gap-3 rounded-2xl bg-brand px-4 py-3.5 text-left text-on-brand shadow-[0_8px_24px_rgb(10_25_40/0.3)]"
      >
        <span className="text-fix">
          <FixIcon />
        </span>
        <span className="flex-1 text-[0.95rem] font-semibold">{t('result.total')}</span>
        <span key={amount} className="display settle tabular text-2xl leading-none">
          {amount}
        </span>
      </button>
    </div>
  )
}
