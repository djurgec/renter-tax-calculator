import { useQuery } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import type { Address } from '../api/types'

interface Props {
  address: Address
  value: number | null
  onChange: (code: number) => void
}

/** Asked only when the address cannot be tied to one municipality. */
export function MunicipalityChoice({ address, value, onChange }: Props) {
  const { t } = useTranslation()
  const name = useId()
  const hasCandidates = address.candidates.length > 0

  return (
    <fieldset className="rounded-2xl bg-warn-bg p-4 text-warn-text">
      <legend className="float-left mb-1 w-full font-semibold">{t('address.pickTitle')}</legend>
      <p className="mb-2 text-sm">
        {hasCandidates ? t('address.ambiguousHelp') : t('address.unknownHelp')}
      </p>
      {hasCandidates ? (
        <div className="flex flex-col gap-1.5">
          {address.candidates.map((m) => (
            <label key={m.code} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/50">
              <input
                type="radio"
                name={name}
                checked={value === m.code}
                onChange={() => onChange(m.code)}
                className="h-[18px] w-[18px]"
              />
              <span>
                {m.name} <span className="text-sm opacity-80">({m.county})</span>
              </span>
            </label>
          ))}
        </div>
      ) : (
        <AllMunicipalities value={value} onChange={onChange} />
      )}
    </fieldset>
  )
}

function AllMunicipalities({ value, onChange }: Omit<Props, 'address'>) {
  const { t } = useTranslation()
  const id = useId()
  const [filter, setFilter] = useState('')
  const list = useQuery({ queryKey: ['municipalities'], queryFn: api.municipalities })
  const f = filter.trim().toLowerCase()
  const shown = (list.data ?? []).filter((m) => m.name.toLowerCase().includes(f)).slice(0, 30)

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {t('address.searchMunicipality')}
      </label>
      <input
        id={id}
        type="text"
        value={filter}
        placeholder={t('address.searchMunicipality')}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-2 w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-ink"
      />
      <select
        size={6}
        aria-label={t('address.searchMunicipality')}
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-line-strong bg-surface text-ink"
      >
        {shown.map((m) => (
          <option key={m.code} value={m.code}>
            {m.name} ({m.county})
          </option>
        ))}
      </select>
    </div>
  )
}
