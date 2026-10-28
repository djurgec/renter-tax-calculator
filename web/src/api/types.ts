// Mirrors src/porezni_kompas/api/models.py. OpenAPI docs: /api/docs

export interface MunicipalityRef {
  code: number
  name: string
  county: string | null
}

export interface LegalRange {
  category: string
  min_amount: number
  max_amount: number
  default_amount: number
}

export interface Provenance {
  dataset: string
  publisher: string
  title: string
  url: string
  licence: string
  downloaded_at: string
  source_row: number | null
}

export interface SearchResult {
  kind: 'address' | 'street'
  address_id: string | null
  street_id: number
  label: string
  house_number: string | null
  address_count: number
  municipality: MunicipalityRef | null
  needs_municipality: boolean
}

export interface HouseNumber {
  address_id: string
  house_number: string
}

export interface Address {
  id: string
  street_id: number
  street: string
  house_number: string
  settlement: string
  postcode: string | null
  label: string
  lat: number | null
  lon: number | null
  municipality: MunicipalityRef | null
  candidates: MunicipalityRef[]
  resolution: string
}

export interface CalculateRequest {
  address_id: string
  municipality_code?: number | null
  beds: number
  camp_units: number
  robinson_units: number
  area_m2?: number | null
  is_primary_residence: boolean
}

export type Unit = 'bed' | 'camp_unit' | 'robinson_unit'

export interface PausalRule {
  id: number
  level: 'house_range' | 'street' | 'settlement' | 'municipality'
  settlement: string | null
  street: string | null
  house_from: number | null
  house_to: number | null
  parity: 'even' | 'odd' | null
  rates: Record<Unit, number | null>
  category: string | null
  source_row: number
  source_ambiguous: boolean
  assignment_inferred: boolean
}

export interface LineItem {
  unit: Unit
  count: number
  rate: number | null
  amount: number | null
}

export interface PausalResult {
  year: number
  level: PausalRule['level'] | null
  rule: PausalRule | null
  amount: number | null
  lines: LineItem[]
  missing_rates: Unit[]
  alternatives: { rule: PausalRule; amount: number }[]
  legal_range: LegalRange | null
}

export interface PropertyTaxRate {
  year: number
  rate_min: number | null
  rate_max: number | null
  is_range: boolean
  raw: string | null
  administered_by: 'PU' | 'JLS' | null
}

export interface PropertyTaxResult {
  rate: PropertyTaxRate | null
  previous: PropertyTaxRate | null
  area_m2: number | null
  exempt: boolean
  amount_min: number | null
  amount_max: number | null
}

export interface CalculationResult {
  address: Address
  municipality: MunicipalityRef
  pausal: PausalResult
  property_tax: PropertyTaxResult
  total_min: number | null
  total_max: number | null
  warnings: string[]
  provenance: Provenance[]
}

export interface MunicipalitySummary extends MunicipalityRef {
  tourism_category: string | null
}

export interface TaxYear {
  year: number
  property_tax: PropertyTaxRate | null
  income_tax_lower: number | null
  income_tax_higher: number | null
  consumption_tax: number | null
}

export interface MunicipalityDetail extends MunicipalitySummary {
  lat: number | null
  lon: number | null
  legal_range: LegalRange | null
  pausal_source_ambiguous: boolean
  pausal_rules: PausalRule[]
  years: TaxYear[]
}

export interface Neighbour extends MunicipalitySummary {
  distance_km: number
  pausal_rate_bed: number | null
  property_tax: PropertyTaxRate | null
}

export interface ValidationCheck {
  check: string
  ok: boolean
  detail: unknown
}

export interface SourcesInfo {
  datasets: {
    key: string
    title: string
    publisher: string
    url: string
    licence: string
    bytes: number
    sha256: string
    downloaded_at: string
  }[]
  build: Record<string, string>
  validation: {
    passed: boolean
    checks: ValidationCheck[]
    warnings: string[]
    stats: {
      addresses: number
      addresses_resolved: number
      resolution: Record<string, number>
      pausal_levels: Record<string, number>
    }
  } | null
}
