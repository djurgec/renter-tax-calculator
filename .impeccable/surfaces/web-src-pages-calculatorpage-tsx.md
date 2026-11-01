---
version: 1
slug: "web-src-pages-calculatorpage-tsx"
primary_target: "web/src/pages/CalculatorPage.tsx"
related_targets: ["web/src/pages/MunicipalityListPage.tsx","web/src/pages/MunicipalityPage.tsx"]
---

# Calculator (web/src/pages/CalculatorPage.tsx) and the map-led pages

Scope: the calculator, municipality list and municipality page. Mode: Operate.
Audience: private renters checking yearly flat-rate and property tax for an address.
User answers: search and map lead with equal weight; must not feel plain.

## Direction contract

THESIS: The rates of Croatia read like a nautical chart: every municipality is a sounding, your address is the position fix. Refuses the category default of a white form beside a result card.

OWN-WORLD: Page ground is shallow-water blue, panels are deep-water white, land on the map is chart buff, ink is chart navy. Chart magenta marks "you": the address fix, your rate on the legal range, the active nav. Barlow for interface text, Spectral for headings and amounts; neighbour rates set as italic Spectral soundings.

STORY: The owner sees the whole coast's rates at a glance, types the address, sees the fix land on the chart with neighbours' rates around it, and reads the total with its source row.

FIRST VIEWPORT: Navy top bar. Left column (~560px): headline, address search, compact unit and area tiles, the result panel. Right: the chart, full height, with legend and title; sticky on desktop. Phone: headline, search, chart (shorter), form, result, sticky total bar.

FORM: Pomorska karta (nautical chart), candidate 4 of 7; seed: seed:ca35fd2db87419e3. Signature: neighbour rates as soundings around the magenta position fix.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
