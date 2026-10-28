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
import { useDebounced } from '../lib/useDebounced'

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

  const calc = useQuery({
    queryKey: ['calculate', debouncedBody],
    queryFn: ({ signal }) => api.calculate(debouncedBody!, signal),
    enabled: debouncedBody != null,
    placeholderData: keepPreviousData,
  })

  return (
    <div>
      <h1 className="text-2xl font-semibold sm:text-3xl">{t('calc.title')}</h1>
      <p className="mt-2 max-w-2xl text-muted">{t('calc.intro', { year: TAX_YEAR })}</p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-5">
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
            <h2 className="mb-4 text-lg font-semibold">{t('form.title')}</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <NumberField label={t('form.beds')} help={t('form.bedsHelp')} value={s.beds} onChange={(v) => update({ b: v })} />
              <NumberField label={t('form.campUnits')} help={t('form.campHelp')} value={s.campUnits} onChange={(v) => update({ k: v })} />
              <NumberField label={t('form.robinson')} help={t('form.robinsonHelp')} value={s.robinsonUnits} onChange={(v) => update({ r: v })} />
              <AreaField value={s.area} onChange={(v) => update({ p: v })} />
            </div>
            <label className="mt-5 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={s.primary}
                onChange={(e) => update({ s: e.target.checked })}
                className="mt-1 h-5 w-5 accent-[var(--brand)]"
              />
              <span>
                <span className="font-medium">{t('form.primary')}</span>
                <span className="block text-sm text-muted">{t('form.primaryHelp')}</span>
              </span>
            </label>
          </Card>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          {calc.data && debouncedBody ? (
            <ResultCard result={calc.data} stale={calc.isFetching} />
          ) : calc.isError ? (
            <Card>
              <ErrorBox error={calc.error} />
            </Card>
          ) : (
            <Card>
              <h2 className="text-lg font-semibold">{t('result.title')}</h2>
              <p className="mt-1 text-muted">{calc.isFetching ? t('loading') : t('result.empty')}</p>
            </Card>
          )}
        </div>
      </div>
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
          <p className="text-lg font-semibold">{address.label}</p>
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
        <Suspense fallback={<div className="h-48 rounded-lg bg-surface-2" />}>
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
      className="rounded-md border border-line px-3 py-1.5 text-sm hover:border-brand"
    >
      {t('search.change')}
    </button>
  )
}

function AreaField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="block font-medium">
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
        className="tabular h-11 w-32 rounded-md border border-line bg-surface px-3 text-lg"
      />
    </div>
  )
}
