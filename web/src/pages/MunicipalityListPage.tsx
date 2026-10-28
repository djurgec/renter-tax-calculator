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
      <h1 className="text-2xl font-semibold sm:text-3xl">{t('muni.listTitle')}</h1>
      {list.data && <p className="mt-2 text-muted">{t('muni.listIntro', { count: list.data.length })}</p>}
      <label htmlFor={id} className="mt-5 block font-medium">
        {t('muni.filter')}
      </label>
      <input
        id={id}
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mt-1 w-full max-w-sm rounded-lg border border-line bg-surface px-3 py-2"
      />
      {list.isLoading && <Loading />}
      {list.isError && <ErrorBox error={list.error} />}
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((m) => (
          <li key={m.code}>
            <Link
              to={`/opcine/${m.code}`}
              className="flex h-full items-start justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2 hover:border-brand"
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
