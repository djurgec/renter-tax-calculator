# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Private renters in Croatia (*iznajmljivači*): people who rent out rooms, apartments or a
holiday home and pay the yearly flat-rate income tax (*paušalni porez*) per bed, plus the
municipal property tax (*porez na nekretnine*) on holiday homes. They check once or twice a
year, often on a phone, sometimes for a relative's property; many are not tax experts.

## Product Purpose

For any address in Croatia, show how much local tax a private renter pays per year and
exactly where each number comes from (the official table and row). Success: the owner gets
a number they trust in under a minute, understands why it is that number, and can compare it
with neighbouring municipalities.

## Positioning

The only tool that resolves an exact address to its municipality and the house-number-level
rule in the Porezna uprava tables, and shows the source row for every amount. Built from
open data (data.gov.hr) for the Datathon Portala otvorenih podataka 2026.

## Operating Context

Users arrive with an address, a number of beds and sometimes a floor area. Rates differ by
municipality, settlement, street and even house-number range; some addresses sit in two
municipalities and need a choice. Property tax may be a range when the municipality has
zones. The official decision (*rješenje*) from the tax office is the final word.

## Capabilities and Constraints

- Address and street search, house-number picker, municipality choice for ambiguous places.
- Flat-rate tax for beds, camp pitches and robinson units; property tax from floor area;
  exemption for a permanent residence; legal range for the tourism category.
- Municipality list and page per municipality (rates 2025/2026, neighbours, all rules).
- Municipality coordinates (centroids) are in the database; no boundary shapes.
- Croatian first, English available. Light and dark themes.
- Informative only: the tax office's decision is final.

## Brand Commitments

- Name: PorezniKompas. Croatian copy stays as written; amounts in hr-HR format.
- User direction: the design must not be plain; the first screen gives the address search
  and a map of Croatia equal weight.

## Evidence on Hand

Real data from Porezna uprava, DGU, MPUDT and Hrvatska pošta via the ETL. No testimonials,
user counts or endorsements exist; none may be invented.

## Product Principles

1. Every amount shows its source.
2. The number first, the explanation one step below it.
3. Comparison is part of the answer: your rate against the legal range and the neighbours.
4. Honest about uncertainty: ranges, inferred assignments and zones are said plainly.

## Accessibility & Inclusion

Users of all ages, many on phones: large touch targets, readable sizes, WCAG AA contrast,
full keyboard use, reduced motion respected.
