# PorezniKompas

Local tax calculator for private renters and holiday-home owners in Croatia.
Type an address, the number of beds and the size of the property, and see the
yearly flat-rate tax for renters (*paušalni porez*) and the property tax
(*porez na nekretnine*), with the official table row each number comes from.

Built for the *Datathon Portala otvorenih podataka 2026* (data.gov.hr).
Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Quick start

From a fresh clone to the app in your browser takes five steps. Commands run from
the repository root (`renter-tax-calculator/`) unless a step says otherwise.
The steps use conda; to use uv instead, see [Using uv instead](#using-uv-instead).

### 1. Create the environment (once)

Requires [Miniconda or Anaconda](https://docs.conda.io/).

```bash
conda env create -f environment.yml
```

This creates the `rent` environment: Python 3.12, SQLite 3.45+, Node.js 22 and
this package installed in editable mode, so code changes apply without
reinstalling.

Activate it in **every new terminal** before running anything else:

```bash
conda activate rent
```

Activation sets `PROJ_DATA`, without which pyproj cannot convert coordinates.

### 2. Build the database (once, then whenever you want fresh data)

```bash
porezni-kompas-etl
```

This downloads the seven public sources (~180 MB: Porezna uprava tax tables, the
DGU address register, the voter register by address, Hrvatska pošta postcodes),
joins them and runs the quality checks. It takes about 4 minutes. The log ends
with ten `PASS` lines and `published data/build/porezni_kompas.sqlite`.

Output:

- `data/raw/<source>/` – downloaded files, cached; the next run reuses them
- `data/build/porezni_kompas.sqlite` – the database the API reads (~180 MB)
- `data/build/validation_report.json` – results of the quality checks

The database is published only if every check passes; otherwise the command
exits with code 1 and the previous database stays in place. Options:

- `--refresh` – download every source again instead of using the cache
- `--force` – publish even if a check fails (for debugging only)
- `--data-dir DIR` – use another data folder (default `data`)

### 3. Start the API (terminal 1)

```bash
porezni-kompas-api
```

It listens on http://127.0.0.1:8000, with interactive docs at
http://127.0.0.1:8000/api/docs. Leave this terminal running.

### 4. Start the frontend (terminal 2)

Open a new terminal, run `conda activate rent`, then:

```bash
cd web
npm install
npm run dev
```

`npm install` is needed only the first time and after dependency changes.

### 5. Open the app

Go to **http://localhost:5173**. The dev server forwards `/api` requests to the
API from step 3, so both terminals must stay running.

### Everyday use

After the first setup, starting the app is only steps 3–5. Rebuild the database
(step 2) when you want newer source data or after changing ETL code.

### Tests

```bash
pytest
```

`tests/test_api_real_db.py` runs only when the database from step 2 exists; the
other tests use a small built-in database. For the frontend, run
`npm run build` (type-check and production build) and `npm run lint` in `web/`.

#### Browser tests (Playwright)

End-to-end tests in `web/e2e/` drive the real app in Chromium, at desktop and
phone size. Once, after `npm install` in `web/`, download the browser:

```bash
npx playwright install chromium
```

Then, in `web/`:

```bash
npm run test:e2e      # run all browser tests
npm run test:e2e:ui   # interactive mode: watch, step through, pick tests
npx playwright show-report   # last run's report, with screenshots of failures
```

The tests start their own API on port 8765 with the small test database
(`tests/e2e_server.py`) and a dev server on port 5174, so they need neither the
real database nor a running app, and the expected amounts never change. They
use `python` when the conda environment is active and `uv run python` otherwise.

#### Continuous integration

GitHub Actions (`.github/workflows/ci.yml`) runs ruff and pytest, the frontend
lint and build, and the Playwright tests on every push to `master` and `develop`
and on every pull request. When the browser tests fail, the run's
`playwright-report` artifact has screenshots and traces of the failures.

### Claude skills

`.claude/skills/` holds skills that Claude Code loads when working in this
repository: `emil-design-eng`, `impeccable` and `taste-skill` for UI design, and
`skill-inspector` for reviewing a skill before adding it. Each is copied from its
upstream repository with that project's licence.

Limits set in `.claude/settings.json` for everyone working here through Claude Code:

- **No local web servers from the design skills.** A hook
  (`.claude/hooks/block-skill-servers.sh`) stops impeccable's live preview and
  decision-page servers (`live`, `live-*`, `serve-question`) and taste-skill's
  screenshot inspector (`scripts/inspect.mjs`, `scripts/scenes.mjs`). The skills
  then review from the source code and show design options as text.
- **impeccable telemetry off** (also in `.impeccable/config.json`). When a new
  design starts, impeccable still fetches design directions from impeccable.style,
  but that service is told not to record which ones were shown or picked.

Every skill is scanned with NVIDIA [SkillSpector](https://github.com/NVIDIA/SkillSpector)
(`.github/workflows/skills.yml`) when skills change and weekly. Findings a person
has reviewed and accepted are recorded per skill in `.skillspector/<skill>.yaml`;
anything else fails the check. To scan locally:

```bash
uv tool install "git+https://github.com/NVIDIA/skillspector.git@v2.13.2"
scripts/scan-skills.sh
```

To add a skill: copy it into `.claude/skills/<name>/` and run the scan. If it
reports findings, review them (ask Claude to "inspect this skill" to use
`skill-inspector`) and, if they are acceptable, record them with
`REASON="what you checked" scripts/scan-skills.sh --accept <name>`. Updating a
skill brings its findings back for another review.

### Using uv instead

Requires [uv](https://docs.astral.sh/uv/) and Node.js 22 (at least 20.19 or 22.12; Vite
refuses older versions). Replace step 1 with:

```bash
uv sync
```

and prefix every Python command with `uv run`: `uv run porezni-kompas-etl`,
`uv run porezni-kompas-api`, `uv run pytest`. Steps 4 and 5 are the same.

### Troubleshooting

- **`No module named uv`** – the `python` on your PATH (e.g. conda's base) has no
  uv. Use the conda environment, or install uv for that Python with
  `python -m pip install uv`.
- **pyproj warning `unable to set PROJ database path`** – the environment is not
  activated; run `conda activate rent`.
- **Port 8000 or 5173 already in use** – another copy is running. Stop it, or
  move the API to another port and point the frontend at it. In PowerShell, run
  `$env:PK_PORT = "8001"` before starting the API and
  `$env:PK_API_URL = "http://127.0.0.1:8001"` before `npm run dev`.
- **The page says the server is not reachable** – the API from step 3 is not
  running, or the database from step 2 has not been built.
- **After changing dependencies** – `pyproject.toml`: run `pip install -e .` in
  the environment (uv: `uv sync`). `environment.yml`: run
  `conda env update -f environment.yml --prune`.

## Configuration

API settings (environment variables):

| Variable | Default | Meaning |
|---|---|---|
| `PK_DB_PATH` | `data/build/porezni_kompas.sqlite` | database file |
| `PK_HOST` | `127.0.0.1` | API host |
| `PK_PORT` | `8000` | API port |
| `PK_CORS_ORIGINS` | `http://localhost:5173` | allowed browser origins, comma-separated |

Frontend: `PK_API_URL` (dev-server proxy target, default
`http://127.0.0.1:8000`), `VITE_API_BASE` (API base path in a production build,
default `/api`). `npm run build` writes the static site to `web/dist/`.

## API

| Endpoint | Purpose |
|---|---|
| `GET /api/addresses/search?q=šercera 4 dubrovnik` | street / address autocomplete |
| `GET /api/addresses/{id}` | address with its municipality, or the candidates |
| `GET /api/streets/{id}/addresses` | house numbers on a street |
| `POST /api/calculate` | flat-rate + property tax with warnings and provenance |
| `GET /api/municipalities[?q=]` | list, for the municipality picker |
| `GET /api/municipalities/{code}` | all rules and rates 2025/2026 |
| `GET /api/municipalities/{code}/neighbours` | nearest municipalities compared |
| `GET /api/meta/sources` | datasets, build info, validation report |
| `GET /api/health` | status and build info |

Full schema: http://127.0.0.1:8000/api/docs (OpenAPI at `/api/openapi.json`).

## Data sources

Porezna uprava (local tax tables 2025/2026), Državna geodetska uprava
(INSPIRE addresses), Ministarstvo pravosuđa, uprave i digitalne transformacije
(voter register by address), Hrvatska pošta (settlements and postcodes).
Exact URLs: `src/porezni_kompas/etl/sources.py`.

## Licence

EUPL-1.2
