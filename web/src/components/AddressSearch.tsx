import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useId, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import type { SearchResult } from '../api/types'
import { useDebounced } from '../lib/useDebounced'
import { Badge, ErrorBox } from './ui'

const MAX_NUMBERS = 48

interface Props {
  onSelect: (addressId: string) => void
}

/** Combobox (WAI-ARIA 1.2 pattern): type, arrow keys to move, Enter to choose. */
export function AddressSearch({ onSelect }: Props) {
  const { t } = useTranslation()
  const id = useId()
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [street, setStreet] = useState<SearchResult | null>(null)
  const q = useDebounced(text.trim(), 200)

  const search = useQuery({
    queryKey: ['search', q],
    queryFn: ({ signal }) => api.search(q, signal),
    enabled: q.length >= 3,
    placeholderData: keepPreviousData,
  })
  const results = q.length >= 3 ? (search.data ?? []) : []
  const showList = open && q.length >= 3

  function choose(r: SearchResult) {
    setOpen(false)
    setActive(-1)
    if (r.kind === 'address' && r.address_id) {
      setStreet(null)
      setText(r.label)
      onSelect(r.address_id)
    } else {
      setStreet(r)
      setText(r.label)
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && showList) {
      const r = results[active] ?? results[0]
      if (r) {
        e.preventDefault()
        choose(r)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div>
      <label htmlFor={`${id}-input`} className="sr-only">
        {t('search.label')}
      </label>
      <div className="relative">
        <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink">
          <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.9" />
          <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
        <input
          id={`${id}-input`}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
          aria-describedby={`${id}-hint`}
          autoComplete="off"
          spellCheck={false}
          value={text}
          placeholder={t('search.placeholder')}
          onChange={(e) => {
            setText(e.target.value)
            setOpen(true)
            setActive(-1)
            setStreet(null)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          className="h-16 w-full rounded-2xl bg-surface pl-14 pr-5 text-[1.2rem] text-ink shadow-[0_1px_0_var(--line-strong)] placeholder:text-muted focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fix"
        />
        {showList && (
          <ul
            id={`${id}-list`}
            role="listbox"
            className="dropdown absolute z-[1000] mt-2 max-h-80 w-full overflow-auto rounded-2xl bg-surface p-1.5 shadow-[0_14px_36px_rgb(15_36_56/0.2)]"
          >
            {results.length === 0 && (
              <li className="px-3 py-2 text-muted" role="presentation">
                {search.isFetching ? t('search.searching') : t('search.noResults')}
              </li>
            )}
            {results.map((r, i) => (
              <li
                key={`${r.street_id}-${r.address_id ?? ''}`}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(r)}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 ${
                  i === active ? 'bg-brand-soft' : ''
                }`}
              >
                <span>{r.label}</span>
                {r.kind === 'street' && (
                  <Badge>
                    {t('search.street')} · {t('search.addresses', { count: r.address_count })}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p id={`${id}-hint`} className="mt-2 px-1 text-sm text-muted">
        {t('search.hint')}
      </p>
      {search.isError && <ErrorBox error={search.error} />}
      {street && <HouseNumberPicker street={street} onPick={onSelect} />}
    </div>
  )
}

function HouseNumberPicker({
  street,
  onPick,
}: {
  street: SearchResult
  onPick: (addressId: string) => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const [filter, setFilter] = useState('')
  const numbers = useQuery({
    queryKey: ['street', street.street_id],
    queryFn: () => api.streetAddresses(street.street_id),
  })
  const f = filter.trim().toUpperCase()
  const matching = (numbers.data ?? []).filter((n) => n.house_number.toUpperCase().startsWith(f))

  return (
    <fieldset className="mt-3 rounded-2xl bg-surface p-4">
      <legend className="float-left mb-3 w-full font-semibold">{t('search.pickNumber')}</legend>
      <label htmlFor={id} className="sr-only">
        {t('search.filterNumbers')}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={filter}
        placeholder={t('search.filterNumbers')}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-3 h-10 w-40 rounded-xl border border-line-strong bg-surface px-3 focus:border-fix focus:outline-none"
      />
      {numbers.isError && <ErrorBox error={numbers.error} />}
      <div className="flex flex-wrap gap-1.5">
        {matching.slice(0, MAX_NUMBERS).map((n) => (
          <button
            key={n.address_id}
            type="button"
            onClick={() => onPick(n.address_id)}
            className="press tabular h-10 min-w-11 rounded-full border border-line-strong px-3 font-semibold hover:border-fix hover:text-fix"
          >
            {n.house_number}
          </button>
        ))}
      </div>
      {numbers.data && matching.length === 0 && (
        <p className="text-sm text-muted">{t('search.noNumbers')}</p>
      )}
      {matching.length > MAX_NUMBERS && (
        <p className="mt-2 text-sm text-muted">
          {t('search.more', { count: matching.length - MAX_NUMBERS })}
        </p>
      )}
    </fieldset>
  )
}
