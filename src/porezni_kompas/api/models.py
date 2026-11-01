"""Request and response models. Warnings are stable codes; the frontend translates them."""

from typing import Literal

from pydantic import BaseModel, Field

# ---- shared


class MunicipalityRef(BaseModel):
    code: int
    name: str
    county: str | None = None


class LegalRange(BaseModel):
    category: str
    min_amount: float
    max_amount: float
    default_amount: float


class Provenance(BaseModel):
    dataset: str
    publisher: str
    title: str
    url: str
    licence: str
    downloaded_at: str
    source_row: int | None = Field(None, description="Row in the official XLSX, if applicable")


# ---- search and addresses


class SearchResult(BaseModel):
    kind: Literal["address", "street"]
    address_id: str | None = None
    street_id: int
    label: str
    house_number: str | None = None
    address_count: int
    municipality: MunicipalityRef | None = Field(
        None, description="Null when the settlement could belong to several municipalities")
    needs_municipality: bool


class HouseNumber(BaseModel):
    address_id: str
    house_number: str


class Address(BaseModel):
    id: str
    street_id: int
    street: str
    house_number: str
    settlement: str
    postcode: str | None
    label: str
    lat: float | None
    lon: float | None
    municipality: MunicipalityRef | None
    candidates: list[MunicipalityRef] = Field(
        default_factory=list, description="Possible municipalities when `municipality` is null")
    resolution: str


# ---- calculation


class CalculateRequest(BaseModel):
    address_id: str
    municipality_code: int | None = Field(
        None, description="Required when the address could belong to several municipalities")
    beds: int = Field(0, ge=0, le=1000)
    camp_units: int = Field(0, ge=0, le=1000)
    robinson_units: int = Field(0, ge=0, le=1000)
    area_m2: float | None = Field(None, gt=0, le=100_000,
                                  description="Living area for property tax; omit to skip it")
    is_primary_residence: bool = False


class PausalRates(BaseModel):
    bed: float | None
    camp_unit: float | None
    robinson_unit: float | None


class PausalRuleOut(BaseModel):
    id: int
    level: str
    settlement: str | None
    street: str | None
    house_from: int | None
    house_to: int | None
    parity: str | None
    rates: PausalRates
    category: str | None
    source_row: int
    source_ambiguous: bool
    assignment_inferred: bool = Field(
        description="The official row names no municipality uniquely; matched by inference")


class LineItem(BaseModel):
    unit: Literal["bed", "camp_unit", "robinson_unit"]
    count: int
    rate: float | None
    amount: float | None


class PausalAlternative(BaseModel):
    rule: PausalRuleOut
    amount: float


class PausalResult(BaseModel):
    year: int
    level: str | None
    rule: PausalRuleOut | None
    amount: float | None = Field(description="Yearly EUR; null when no rule applies")
    lines: list[LineItem]
    missing_rates: list[str]
    alternatives: list[PausalAlternative]
    legal_range: LegalRange | None


class PropertyTaxRate(BaseModel):
    year: int
    rate_min: float | None
    rate_max: float | None
    is_range: bool
    raw: str | None
    administered_by: str | None = Field(description="PU = Porezna uprava, JLS = municipality")


class PropertyTaxResult(BaseModel):
    rate: PropertyTaxRate | None
    previous: PropertyTaxRate | None
    area_m2: float | None
    exempt: bool
    amount_min: float | None
    amount_max: float | None


class CalculationResult(BaseModel):
    address: Address
    municipality: MunicipalityRef
    pausal: PausalResult
    property_tax: PropertyTaxResult
    total_min: float | None
    total_max: float | None
    warnings: list[str]
    provenance: list[Provenance]


# ---- municipalities


class TaxYear(BaseModel):
    year: int
    property_tax: PropertyTaxRate | None
    income_tax_lower: float | None
    income_tax_higher: float | None
    consumption_tax: float | None


class MunicipalitySummary(MunicipalityRef):
    tourism_category: str | None


class MunicipalityDetail(MunicipalitySummary):
    lat: float | None
    lon: float | None
    legal_range: LegalRange | None
    pausal_source_ambiguous: bool
    pausal_rules: list[PausalRuleOut]
    years: list[TaxYear]


class Neighbour(MunicipalitySummary):
    distance_km: float
    pausal_rate_bed: float | None = Field(description="Municipality-wide per-bed rate, if any")
    property_tax: PropertyTaxRate | None


class MapPoint(BaseModel):
    code: int
    name: str
    tourism_category: str | None
    lat: float
    lon: float
    rate_bed: float | None = Field(description="Municipality-wide per-bed rate, if exactly one")
    rate_min: float | None = Field(description="Lowest per-bed rate of any rule")
    rate_max: float | None = Field(description="Highest per-bed rate of any rule")


# ---- meta


class DatasetInfo(BaseModel):
    key: str
    title: str
    publisher: str
    url: str
    licence: str
    bytes: int
    sha256: str
    downloaded_at: str


class SourcesInfo(BaseModel):
    datasets: list[DatasetInfo]
    build: dict[str, str]
    validation: dict | None
