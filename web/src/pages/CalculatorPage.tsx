import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import type { Address, CalculateRequest } from '../api/types'
import { AddressSearch } from '../components/AddressSearch'
import { MunicipalityChoice } from '../components/MunicipalityChoice'
import { NumberField } from '../components/NumberField'
import { ResultCard } from '../components/ResultCard'
import { Card, ErrorBox, Loading } from '../components/ui'
import { eurRange } from '../lib/format'
import { useDebounced } from '../lib/useDebounced'
import { useInView } from '../lib/useInView'

const AddressMap = lazy(() => import('../components/AddressMap'))
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

  const resultRef = useRef<HTMLDivElement>(null)
  const resultInView = useInView(resultRef, 96)

  const calc = useQuery({
    queryKey: ['calculate', debouncedBody],
    queryFn: ({ signal }) => api.calculate(debouncedBody!, signal),
    enabled: debouncedBody != null,
    placeholderData: keepPreviousData,
  })

  return (
    <div>
      <h1 className="max-w-3xl text-[2rem] leading-[1.08] sm:text-[2.75rem]">{t('calc.title')}</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">{t('calc.intro', { year: TAX_YEAR })}</p>

      <div className="mt-8 grid gap-6 sm:mt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <div className="space-y-6">
          <Card>
            {!s.addressId ? (
              <AddressSearch onSelect={(id) => update({ a: id, m: null })} />
            ) : address.isLoading ? (
              <Loading />
            ) : address.isError ? (
              <>
                <ErrorBox error={address.error} />
                <ChangeButton onClick={() => update({ a: null, m: null })} />
              </>
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
          </Card>

          <Card>
            <h2 className="display mb-5 text-2xl">{t('form.title')}</h2>
            <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2">
              <NumberField label={t('form.beds')} help={t('form.bedsHelp')} value={s.beds} onChange={(v) => update({ b: v })} />
              <NumberField label={t('form.campUnits')} help={t('form.campHelp')} value={s.campUnits} onChange={(v) => update({ k: v })} />
              <NumberField label={t('form.robinson')} help={t('form.robinsonHelp')} value={s.robinsonUnits} onChange={(v) => update({ r: v })} />
              <AreaField value={s.area} onChange={(v) => update({ p: v })} />
            </div>
            <label className="mt-7 flex cursor-pointer items-start gap-3 rounded-xl bg-surface-2/60 p-4 transition-colors hover:bg-surface-2">
              <input
                type="checkbox"
                checked={s.primary}
                onChange={(e) => update({ s: e.target.checked })}
                className="mt-0.5 h-5 w-5 shrink-0"
              />
              <span>
                <span className="font-medium">{t('form.primary')}</span>
                <span className="block text-sm text-muted">{t('form.primaryHelp')}</span>
              </span>
            </label>
          </Card>
        </div>

        <div ref={resultRef} className="scroll-mt-4 lg:sticky lg:top-6 lg:self-start">
          {calc.data && debouncedBody ? (
            <ResultCard result={calc.data} stale={calc.isFetching} />
          ) : calc.isError ? (
            <Card>
              <ErrorBox error={calc.error} />
            </Card>
          ) : (
            <Card className="bg-surface-2/70">
              <h2 className="display text-2xl">{t('result.title')}</h2>
              <p className="mt-2 text-muted">{calc.isFetching ? t('loading') : t('result.empty')}</p>
            </Card>
          )}
        </div>
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

/** Phones only: the total stays in reach while the form is being filled in. */
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
        className="press flex w-full items-end gap-3 rounded-2xl bg-shell px-4 py-3.5 text-left text-on-shell shadow-[0_8px_24px_rgb(10_30_45/0.28)]"
      >
        <span className="pb-0.5 text-[0.95rem] font-semibold">{t('result.total')}</span>
        <span aria-hidden="true" className="mb-1.5 min-w-4 flex-1 border-b-2 border-dotted border-on-shell-muted/60" />
        <span key={amount} className="display settle tabular text-2xl leading-none">
          {amount}
        </span>
        <svg aria-hidden="true" viewBox="0 0 16 16" className="mb-0.5 h-4 w-4 shrink-0 text-on-shell-muted">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm text-muted">{t('search.label')}</p>
          <p className="display mt-0.5 text-xl leading-snug">{address.label}</p>
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
      {address.lat != null && address.lon != null && (
        <Suspense fallback={<div className="h-48 rounded-xl bg-surface-2" />}>
          <AddressMap lat={address.lat} lon={address.lon} label={address.label} />
        </Suspense>
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
      className="press shrink-0 rounded-full border border-line-strong px-3.5 py-1.5 text-sm font-medium hover:border-brand hover:text-brand"
    >
      {t('search.change')}
    </button>
  )
}

function AreaField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="block font-semibold">
        {t('form.area')}
      </label>
      <p id={`${id}-help`} className="mb-1.5 text-sm text-muted">
        {t('form.areaHelp')}
      </p>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={value}
        aria-describedby={`${id}-help`}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, '').slice(0, 8))}
        className="tabular mt-auto h-12 w-36 rounded-xl border border-line-strong bg-surface px-3.5 text-lg transition-colors hover:border-brand focus:border-brand focus:outline-none focus-visible:outline-2 focus-visible:outline-brand"
      />
    </div>
  )
}
