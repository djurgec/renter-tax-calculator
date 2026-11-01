# PorezniKompas

**Live demo: https://porezni-kompas.onrender.com**
(open API: https://porezni-kompas.onrender.com/api/docs)

> The demo runs on Render's free tier: after 15 minutes without visitors it
> sleeps, and the first page load then takes about a minute.

Local tax calculator for private renters and holiday-home owners in Croatia.
Type an address, the number of beds and the size of the property, and see the
yearly flat-rate tax for renters (*paušalni porez*) and the property tax
(*porez na nekretnine*), with the official table row each number comes from.

Built for the *Datathon Portala otvorenih podataka 2026* (data.gov.hr).
Technical and project documentation (in Croatian): [docs/DOKUMENTACIJA.md](docs/DOKUMENTACIJA.md).

## Run it locally

Requires [Docker](https://docs.docker.com/get-docker/). From the repository root:

```bash
docker compose up --build
```

Open http://localhost:8000. This builds the same image as the demo and uses the
published database (the GitHub release [`data`](https://github.com/djurgec/renter-tax-calculator/releases/tag/data)), so no
data processing is needed. The first build takes a few minutes.

### Rebuild the database yourself

```bash
docker compose run --rm etl
```

This downloads the eight public sources (~390 MB), joins them and runs the
twelve quality checks. It writes `data/build/porezni_kompas.sqlite` and
`data/build/validation_report.json`. To download every
source again instead of using the cache:

```bash
docker compose run --rm etl porezni-kompas-etl --data-dir /work --refresh
```

Serve the app on your own build:

```bash
docker compose --profile local up --build local
```

## How it works

1. **ETL** (`src/porezni_kompas/etl/`) downloads the sources, parses the Porezna
   tables, streams the DGU address register (1.68 M addresses) and links every
   address to its municipality through DGU's register of spatial units. It then
   matches each address to the most specific flat-rate rule (house-number range →
   street → settlement → municipality) and writes one SQLite file.
2. **API** (FastAPI, `src/porezni_kompas/api/`) answers search, calculation and
   municipality requests from that file, read-only. Amounts come from plain,
   unit-tested Python code; every result lists its sources and table row.
3. **Web app** (React, `web/`) is served by the same process in production.

Architecture, data linking, quality checks and prerequisites:
[docs/DOKUMENTACIJA.md](docs/DOKUMENTACIJA.md).

## Data sources

| Dataset | Publisher | Link | Used for |
|---|---|---|---|
| Visina paušalnog poreza na dohodak po JLS za 2026. | Porezna uprava | [data.gov.hr](https://data.gov.hr/ckan/dataset/3c19c044-4cc4-42f1-ac97-29286a2bf305) | flat-rate rate per bed, street, settlement or municipality |
| Usporedba poreza na nekretnine 2025/2026 | Porezna uprava | same dataset | property tax rate, who bills it |
| Stope poreza na dohodak 2025 i 2026 | Porezna uprava | same dataset | income tax rates (municipality pages) |
| Visina stopa poreza na potrošnju za 2026. | Porezna uprava | same dataset | official municipality codes, consumption tax |
| Adrese (INSPIRE) | Državna geodetska uprava | [geoportal.dgu.hr](https://geoportal.dgu.hr/services/atom/INSPIRE_Addresses_(AD).zip) | every address, house number and position |
| Administrativne jedinice (INSPIRE) | Državna geodetska uprava | [geoportal.dgu.hr](https://geoportal.dgu.hr/services/atom/INSPIRE_Administrative_Units_(AU).zip) | settlement → municipality for every address |
| Registar birača – broj birača po adresi | Ministarstvo pravosuđa, uprave i digitalne transformacije | [data.gov.hr](https://data.gov.hr/ckan/dataset/a4f06d5d-52bd-46b5-a4e7-cf01d4f6e227) | municipality counties; cross-check of the address links |
| Naselje i odredišni poštanski ured | Hrvatska pošta | [posta.hr](https://www.posta.hr/mjestaRh.aspx) | cross-check of the address links |

Exact download URLs and checksums: `src/porezni_kompas/etl/sources.py` and the
`/api/meta/sources` endpoint.

## Deployment

Production is one Docker image (`Dockerfile`) that serves the web app and the API
on one port, on a free [Render](https://render.com) web service (`render.yaml`).

1. **Database:** the **Data** workflow (`.github/workflows/data.yml`, run by hand
   or weekly) runs the ETL on GitHub and publishes `porezni_kompas.sqlite`, its
   SHA-256 and `validation_report.json` as the GitHub release `data`, only if
   every check passes.
2. **Image:** the Dockerfile builds the web app, installs the Python package from
   `uv.lock`, downloads the database from that release and checks the SHA-256.
3. **Render** rebuilds the image on every push to `master` once CI has passed, and
   after each Data run when the repository secret `RENDER_DEPLOY_HOOK` holds the
   service's deploy hook.

To publish new data: Actions → Data → Run workflow.


## Configuration

API settings (environment variables):

| Variable | Default | Meaning |
|---|---|---|
| `PK_DB_PATH` | `data/build/porezni_kompas.sqlite` | database file |
| `PK_HOST` | `127.0.0.1` | API host |
| `PK_PORT` | `8000` | API port (if unset, `PORT` is used, which hosts such as Render set) |
| `PK_CORS_ORIGINS` | `http://localhost:5173` | allowed browser origins, comma-separated |
| `PK_WEB_DIR` | unset | serve the built web app (`web/dist`) from the API, on the same origin |
| `PK_RATE_LIMIT` | `0` (off) | API requests per client IP per minute; `/api/health` is never limited |

Web app: `PK_API_URL` (dev-server proxy target, default `http://127.0.0.1:8000`),
`VITE_API_BASE` (API base path in a production build, default `/api`).

## API

| Endpoint | Purpose |
|---|---|
| `GET /api/addresses/search?q=šercera 4 dubrovnik` | street / address autocomplete |
| `GET /api/addresses/{id}` | address with its municipality |
| `GET /api/streets/{id}/addresses` | house numbers on a street |
| `POST /api/calculate` | flat-rate + property tax with warnings and provenance |
| `GET /api/municipalities[?q=]` | list of municipalities |
| `GET /api/municipalities/{code}` | all rules and rates 2025/2026 |
| `GET /api/municipalities/{code}/neighbours` | nearest municipalities compared |
| `GET /api/map` | per-municipality rates for the map |
| `GET /api/meta/sources` | datasets, build info, validation report |
| `GET /api/health` | status and build info |

Full schema: [/api/docs](https://porezni-kompas.onrender.com/api/docs) (OpenAPI at
`/api/openapi.json`).

## Development

For changing the code rather than running the app. Requires
[uv](https://docs.astral.sh/uv/) and Node.js 22 (at least 20.19 or 22.12).

```bash
uv sync
uv run porezni-kompas-etl      # build data/build/porezni_kompas.sqlite
uv run porezni-kompas-api      # API on http://127.0.0.1:8000
```

In a second terminal, the web app with live reload on http://localhost:5173:

```bash
cd web
npm install
npm run dev
```

Tests:

```bash
uv run ruff check .
uv run pytest                  # tests/test_api_real_db.py needs the built database
```

In `web/`: `npm run lint`, `npm run build`, and the Playwright browser tests
(`npx playwright install chromium` once, then `npm run test:e2e`). The browser
tests start their own API on a small test database, so they need no real data.

GitHub Actions (`.github/workflows/ci.yml`) runs all of these on every push to
`master` and `develop` and on every pull request.


## Licence

EUPL-1.2
