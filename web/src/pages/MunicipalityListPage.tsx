import { useQuery } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Badge, ErrorBox, Loading } from '../components/ui'

const fold = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/gi, 'd').toLowerCase()

export function MunicipalityListPage() {
  const { t } = useTranslation()
  const id = useId()
  const [filter, setFilter] = useState('')
  const list = useQuery({ queryKey: ['municipalities'], queryFn: api.municipalities })
  const f = fold(filter.trim())
  const shown = (list.data ?? []).filter((m) => fold(`${m.name} ${m.county ?? ''}`).includes(f))

  return (
    <div>
      <h1 className="text-[2rem] leading-[1.1] sm:text-[2.5rem]">{t('muni.listTitle')}</h1>
      {list.data && <p className="mt-2 text-muted">{t('muni.listIntro', { count: list.data.length })}</p>}
      <label htmlFor={id} className="mt-8 block font-semibold">
        {t('muni.filter')}
      </label>
      <input
        id={id}
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mt-2 h-12 w-full max-w-sm rounded-xl border border-line-strong bg-surface px-4 text-lg transition-colors hover:border-brand focus:border-brand focus:outline-none focus-visible:outline-2 focus-visible:outline-brand"
      />
      {list.isLoading && <Loading />}
      {list.isError && <ErrorBox error={list.error} />}
      <ul className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((m) => (
          <li key={m.code}>
            <Link
              to={`/opcine/${m.code}`}
              className="press flex h-full items-start justify-between gap-2 rounded-xl bg-surface px-4 py-3 hover:bg-brand-soft"
            >
              <span>
                <span className="font-medium">{m.name}</span>
                <span className="block text-sm text-muted">{m.county}</span>
              </span>
              {m.tourism_category && <Badge tone="brand">{m.tourism_category}</Badge>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
