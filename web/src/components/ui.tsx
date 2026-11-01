import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../api/client'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[1.25rem] bg-surface p-5 sm:p-6 ${className}`}>
      {children}
    </section>
  )
}

export function Loading() {
  const { t } = useTranslation()
  return (
    <p role="status" className="text-muted">
      {t('loading')}
    </p>
  )
}

export function ErrorBox({ error }: { error: unknown }) {
  const { t } = useTranslation()
  // a failed fetch (no HTTP status) almost always means the API is not running
  const message = error instanceof ApiError ? error.message : t('apiDown')
  return (
    <p role="alert" className="rounded-lg bg-bad/10 px-3 py-2 text-bad">
      {error instanceof ApiError && error.status >= 500 ? t('error') : message}
    </p>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'brand' }) {
  const cls =
    tone === 'brand' ? 'bg-brand-soft text-ink' : 'bg-surface-2 text-muted'
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  )
}
