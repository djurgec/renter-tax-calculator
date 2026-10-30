import { useId } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  label: string
  help?: string
  value: number
  onChange: (value: number) => void
  max?: number
}

/** Whole-number input with − / + buttons, large enough for touch. */
export function NumberField({ label, help, value, onChange, max = 999 }: Props) {
  const { t } = useTranslation()
  const id = useId()
  const set = (v: number) => onChange(Math.min(max, Math.max(0, Math.round(v) || 0)))
  const btn =
    'press grid h-12 w-12 shrink-0 place-items-center rounded-full border border-line-strong bg-surface text-brand hover:border-brand hover:bg-brand-soft disabled:border-line disabled:bg-transparent disabled:text-muted/50'

  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="block font-semibold">
        {label}
      </label>
      {help && (
        <p id={`${id}-help`} className="mb-1.5 text-sm text-muted">
          {help}
        </p>
      )}
      <div className="mt-auto flex items-center gap-2 pt-1">
        <button
          type="button"
          className={btn}
          onClick={() => set(value - 1)}
          disabled={value <= 0}
          aria-label={`${t('form.decrease')}: ${label}`}
        >
          <StepIcon />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          max={max}
          value={value}
          aria-describedby={help ? `${id}-help` : undefined}
          onChange={(e) => set(Number(e.target.value))}
          className="tabular h-12 w-20 rounded-xl border border-line-strong bg-surface text-center text-lg transition-colors hover:border-brand focus:border-brand focus:outline-none focus-visible:outline-2 focus-visible:outline-brand"
        />
        <button
          type="button"
          className={btn}
          onClick={() => set(value + 1)}
          disabled={value >= max}
          aria-label={`${t('form.increase')}: ${label}`}
        >
          <StepIcon plus />
        </button>
      </div>
    </div>
  )
}

function StepIcon({ plus = false }: { plus?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4">
      <path d={plus ? 'M3 8h10M8 3v10' : 'M3 8h10'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
