import type { TFunction } from 'i18next'
import type { PausalRule } from '../api/types'

/** "Rate for house numbers 1–6 on Ulica dr. Ante Šercera (even side)" */
export function describeRule(rule: PausalRule, t: TFunction): string {
  let text = t(`result.level.${rule.level}`, {
    street: rule.street ?? '',
    settlement: rule.settlement ?? '',
    from: rule.house_from,
    // the ETL stores an open-ended range ("from 20") with a very large upper bound
    to: rule.house_to != null && rule.house_to >= 100_000 ? '…' : rule.house_to,
  })
  if (rule.parity) text += ` (${t(`result.parity.${rule.parity}`)})`
  return text
}
