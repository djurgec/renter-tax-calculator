# PorezniKompas: open issues

Deferred until the main build steps (ETL, API, frontend, deployment) are done.
Numbers come from the ETL run of 28.10.2026 (`data/build/validation_report.json`).
Row numbers refer to the Excel row in `data/raw/porezna_pausal/pausal_2026.xlsx`
(source: Porezna uprava, "Visina paušalnog poreza na dohodak po JLS za 2026. godinu", data.gov.hr).

## Needs a person (checking official sources)

- [ ] **Otok (optional): confirm the inferred split.** Rows 1015 (20 €) → Grad Otok near Vinkovci
      (5355) and 1016 (60 €) → Općina Otok near Sinj (3140) are applied as `verified=inferred`; the
      app shows a warning for them. If either municipality's flat-rate decision turns up, set
      `verified=yes` in `data/reference/pausal_municipality_overrides.csv`.
- [ ] **Grožnjan-Grisignana: 773 addresses get no rate**
  - The table lists only some settlements or streets for this municipality, with no municipality-wide
    row. Check whether the missing part is untaxed or simply absent from the table.
- [ ] **Makarska: 389 addresses fall outside every listed house-number range** (and 2 in Dubrovnik).
  - They fall back to the settlement/municipality rate with a warning. Check whether that matches
    the municipal decision.
- [ ] **Licences**
  - Voter register by address (MPUDT): licence not stated clearly. Ask open.data@mpudt.hr.
  - DGU INSPIRE Addresses: confirm reuse terms (the data.gov.hr ATOM link for it is empty; we download
    from geoportal.dgu.hr directly).
  - Hrvatska pošta settlement list (posta.hr): confirm reuse terms.

## Code fixes (data quality)

- [ ] **15 Dubrovnik streets in the table not found in DGU**: rows 142, 181, 198, 199, 200, 209, 334,
      345, 431, 439, 462, 475, 477, 478, 480. These are abbreviations (`POLJ.P.MILIČEVIĆA`), parks and
      misspellings (`ĐURA BALJEVI`). Add a `data/reference/street_aliases.csv` and look each one up.
- [ ] **24,530 addresses ambiguous between municipalities** (Blato 20271, Sesvete 10361 and 10040,
      Milna 21405, Strmec 10434, Milanovac 33000, Novaki 10431, Brezje 10431, ...). Try to break the
      tie with the street name: if the street exists in the voter register under only one candidate
      municipality, pick that one.
- [ ] **1,613 addresses with no municipality found**. The biggest groups are bilingual Istrian names
      (`Bužinija - Businìa`, `Kaldanija - Caldanìa`, `Plovanija - Plovanìa`). Retry with the part
      before ` - `. Also handle names with notes in brackets (`Grabovo-dio (Ovčara, Jakobovac)`).
- [ ] **Truncated names in the flat-rate table** (`KAŠTELIR-LABINCI - CASTELLIERE-S. D`, Tar-Vabriga)
      match through the prefix fallback today. Add a unit test so they keep matching.
- [ ] **Hard-coded source URLs** in `etl/sources.py`. The voter register filename carries a date
      (`bb_po_adresi_13_05_2026.csv`) and Porezna publishes new tables each year. Discover the newest
      resource through the CKAN `package_show` API instead.

## API follow-ups

- [ ] Very common search words (`ulica`, `put`) hit the 5,000-candidate cap (~160 ms locally,
      ~2.3 s on Render's 0.1 CPU) and may drop good matches. Pre-filter with the settlement token
      when there is one.
- [ ] Property-tax exemptions other than primary residence (long-term rent etc.) are not modelled;
      check the law and add inputs if needed.
- [ ] Neighbour comparison shows no per-bed rate for municipalities without a single
      municipality-wide row (e.g. Dubrovnik, Župa dubrovačka). Show a min-max of their rules instead.
- [ ] Starlette warns that `httpx` in TestClient is deprecated; switch when FastAPI updates.

## Remaining from ARCHITECTURE.md

- [ ] First Render deployment: make the repo public, run the Data workflow, create the
      Blueprint (README → Deployment)
- [ ] `docs/DATA_SOURCES.md` and `docs/DATA_QUALITY.md` (the figures above belong there)
- [ ] Golden-address regression set covering every rule level
- [ ] Ask open.data@mpudt.hr about the licences (see "Licences" above)
- [ ] 3-minute video and submission (09.11.2026)
- [ ] Optional: AI assistant (Ollama + RAG)
