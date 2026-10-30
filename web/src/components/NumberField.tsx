import { useId } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  label: string
  help?: string
  value: number
  onChange: (value: number) => void
  max?: number
}

/** Whole-number tile: the count large, − / + buttons big enough for a thumb. */
export function NumberField({ label, help, value, onChange, max = 999 }: Props) {
  const { t } = useTranslation()
  const id = useId()
  const set = (v: number) => onChange(Math.min(max, Math.max(0, Math.round(v) || 0)))
  const btn =
    'press grid h-10 w-10 shrink-0 place-items-center rounded-full border-[1.5px] border-brand/70 text-ink hover:border-fix hover:text-fix disabled:border-line-strong disabled:text-muted/60'

  return (
    <div className="flex flex-col rounded-2xl bg-surface/65 px-4 pb-2.5 pt-2.5 transition-colors focus-within:bg-surface">
      <label htmlFor={id} className="text-[0.92rem] font-semibold">
        {label}
      </label>
      {help && (
        <p id={`${id}-help`} className="text-[0.8rem] leading-snug text-muted">
          {help}
        </p>
      )}
      <div className="mt-auto flex items-center gap-2 pt-1.5">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          max={max}
          value={value}
          aria-describedby={help ? `${id}-help` : undefined}
          onChange={(e) => set(Number(e.target.value))}
          className="tabular w-full min-w-0 bg-transparent text-[1.6rem] font-semibold leading-none focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          className={btn}
          onClick={() => set(value - 1)}
          disabled={value <= 0}
          aria-label={`${t('form.decrease')}: ${label}`}
        >
          <StepIcon />
        </button>
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
