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
    'h-11 w-11 shrink-0 rounded-md border border-line text-lg font-medium hover:border-brand disabled:opacity-40'

  return (
    <div>
      <label htmlFor={id} className="block font-medium">
        {label}
      </label>
      {help && (
        <p id={`${id}-help`} className="mb-1.5 text-sm text-muted">
          {help}
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={btn}
          onClick={() => set(value - 1)}
          disabled={value <= 0}
          aria-label={`${t('form.decrease')}: ${label}`}
        >
          −
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
          className="tabular h-11 w-20 rounded-md border border-line bg-surface text-center text-lg"
        />
        <button
          type="button"
          className={btn}
          onClick={() => set(value + 1)}
          disabled={value >= max}
          aria-label={`${t('form.increase')}: ${label}`}
        >
          +
        </button>
      </div>
    </div>
  )
}
