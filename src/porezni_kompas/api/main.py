"""FastAPI application. Run with `uv run porezni-kompas-api` (docs at /api/docs)."""

import json
import os
import sqlite3
import time
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from .. import __version__
from . import calculate as calc
from . import municipalities as muni
from . import search as srch
from .db import db_path_from_env, get_db
from .models import (
    Address,
    CalculateRequest,
    CalculationResult,
    HouseNumber,
    MapPoint,
    MunicipalityDetail,
    MunicipalitySummary,
    Neighbour,
    SearchResult,
    SourcesInfo,
)

Db = Annotated[sqlite3.Connection, Depends(get_db)]
router = APIRouter(prefix="/api")


@router.get("/health")
def health(db: Db) -> dict:
    info = dict(db.execute("SELECT key, value FROM build_info").fetchall())
    return {"status": "ok", "version": __version__, **info}


@router.get("/addresses/search", response_model=list[SearchResult])
def search_addresses(db: Db, q: Annotated[str, Query(min_length=2, max_length=200)],
                     limit: Annotated[int, Query(ge=1, le=50)] = 10):
    """Street and address autocomplete, e.g. `šercera 4 dubrovnik` or `ilica 1 10000`."""
    return srch.search(db, q, limit)


@router.get("/addresses/{address_id}", response_model=Address)
def get_address(db: Db, address_id: str):
    try:
        return calc.public_address(calc.get_address(db, address_id))
    except calc.NotFound as e:
        raise HTTPException(404, str(e)) from e


@router.get("/streets/{street_id}/addresses", response_model=list[HouseNumber])
def street_addresses(db: Db, street_id: int):
    """All house numbers on a street, for picking one after a street-only search."""
    numbers = srch.house_numbers(db, street_id)
    if not numbers:
        raise HTTPException(404, f"street {street_id} not found")
    return numbers


@router.post("/calculate", response_model=CalculationResult,
             responses={409: {"description": "Address needs `municipality_code`; "
                              "`detail.candidates` lists the choices"}})
def calculate(db: Db, req: CalculateRequest):
    try:
        return calc.calculate(db, req)
    except calc.NotFound as e:
        raise HTTPException(404, str(e)) from e
    except calc.MunicipalityRequired as e:
        raise HTTPException(409, {"code": "municipality_required",
                                  "candidates": e.candidates}) from e
    except calc.InvalidMunicipality as e:
        raise HTTPException(422, str(e)) from e


@router.get("/municipalities", response_model=list[MunicipalitySummary])
def list_municipalities(db: Db, q: Annotated[str | None, Query(max_length=100)] = None):
    return muni.list_municipalities(db, q)


@router.get("/map", response_model=list[MapPoint])
def map_points(db: Db):
    return muni.map_points(db)


@router.get("/municipalities/{code}", response_model=MunicipalityDetail)
def municipality(db: Db, code: int):
    try:
        return muni.municipality_detail(db, code)
    except calc.NotFound as e:
        raise HTTPException(404, str(e)) from e


@router.get("/municipalities/{code}/neighbours", response_model=list[Neighbour])
def neighbours(db: Db, code: int, limit: Annotated[int, Query(ge=1, le=30)] = 8):
    try:
        return muni.neighbours(db, code, limit)
    except calc.NotFound as e:
        raise HTTPException(404, str(e)) from e


@router.get("/meta/sources", response_model=SourcesInfo)
def sources(db: Db, request: Request):
    datasets = [{"key": r["key"], "title": r["dataset"], "publisher": r["publisher"],
                 "url": r["url"], "licence": r["licence"], "bytes": r["bytes"],
                 "sha256": r["sha256"], "downloaded_at": r["downloaded_at"]}
                for r in db.execute("SELECT * FROM dataset_meta ORDER BY key")]
    report = request.app.state.db_path.with_name("validation_report.json")
    validation = json.loads(report.read_text(encoding="utf-8")) if report.exists() else None
    return {"datasets": datasets,
            "build": dict(db.execute("SELECT key, value FROM build_info").fetchall()),
            "validation": validation}


def create_app(db_path: Path | None = None) -> FastAPI:
    db_path = Path(db_path or db_path_from_env())
    if not db_path.exists():
        raise RuntimeError(f"{db_path} not found: run `uv run porezni-kompas-etl` first "
                           "or set PK_DB_PATH")
    app = FastAPI(title="PorezniKompas API", version=__version__,
                  description="Local taxes for private renters in Croatia, for every address. "
                              "Open data from Porezna uprava, DGU, MPUDT and Hrvatska pošta.",
                  docs_url="/api/docs", redoc_url=None, openapi_url="/api/openapi.json")
    app.state.db_path = db_path
    origins = os.environ.get("PK_CORS_ORIGINS", "http://localhost:5173").split(",")
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET", "POST"],
                       allow_headers=["Content-Type"])
    app.include_router(router)
    rate_limit = int(os.environ.get("PK_RATE_LIMIT", "0"))
    if rate_limit > 0:
        _add_rate_limit(app, rate_limit)
    web_dir = os.environ.get("PK_WEB_DIR")
    if web_dir:
        _serve_frontend(app, Path(web_dir))
    return app


def _add_rate_limit(app: FastAPI, per_minute: int) -> None:
    """At most `per_minute` API requests per client IP per minute (fixed window).

    One process holds the counters, which is enough for a single small instance. Behind a
    proxy the client IP comes from X-Forwarded-For (uvicorn: FORWARDED_ALLOW_IPS).
    """
    hits: dict[str, tuple[int, int]] = {}

    @app.middleware("http")
    async def rate_limit(request: Request, call_next):
        path = request.url.path
        if not path.startswith("/api/") or path == "/api/health":
            return await call_next(request)
        window = int(time.time() // 60)
        ip = request.client.host if request.client else "unknown"
        seen, count = hits.get(ip, (window, 0))
        count = count + 1 if seen == window else 1
        hits[ip] = (window, count)
        if len(hits) > 10_000:  # forget clients from earlier minutes
            for key in [k for k, (w, _) in hits.items() if w != window]:
                del hits[key]
        if count > per_minute:
            return JSONResponse({"detail": "too many requests, try again in a minute"},
                                status_code=429,
                                headers={"Retry-After": str(60 - int(time.time()) % 60)})
        return await call_next(request)


def _serve_frontend(app: FastAPI, web_dir: Path) -> None:
    """Serve the built web app (web/dist) next to the API, on the same origin.

    Files that exist are returned as they are; any other path gets index.html, so the
    app's own routes (/opcine/981, /o-podacima) work on reload. Unknown /api paths stay 404.
    """
    root = web_dir.resolve()
    index = root / "index.html"
    if not index.exists():
        raise RuntimeError(f"{index} not found: run `npm run build` in web/ or unset PK_WEB_DIR")

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str):
        if path == "api" or path.startswith("api/"):
            raise HTTPException(404, "Not Found")
        file = (root / path).resolve()
        if path and file.is_file() and file.is_relative_to(root):
            # Vite puts a content hash in every asset name, so those never change
            cache = ("public, max-age=31536000, immutable" if path.startswith("assets/")
                     else "public, max-age=3600")
            return FileResponse(file, headers={"Cache-Control": cache})
        return FileResponse(index, headers={"Cache-Control": "no-cache"})


def run() -> None:
    import uvicorn

    # PK_PORT wins; PORT is what hosts such as Render set
    port = os.environ.get("PK_PORT") or os.environ.get("PORT") or "8000"
    uvicorn.run("porezni_kompas.api.main:create_app", factory=True,
                host=os.environ.get("PK_HOST", "127.0.0.1"), port=int(port))
