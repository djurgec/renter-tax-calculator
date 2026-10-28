"""Download sources with retries and record provenance (checksum, size, dates)."""

import hashlib
import json
import logging
import time
from datetime import UTC, datetime
from pathlib import Path

import httpx

from .sources import Source

log = logging.getLogger(__name__)
_HEADERS = {"User-Agent": "PorezniKompas-ETL/0.1 (+https://data.gov.hr)"}


def raw_path(raw_dir: Path, source: Source) -> Path:
    return raw_dir / source.key / source.filename


def meta_path(raw_dir: Path, source: Source) -> Path:
    return raw_dir / source.key / "meta.json"


def download(source: Source, raw_dir: Path, refresh: bool = False, attempts: int = 6) -> dict:
    """Fetch one source unless it is already cached. Returns its metadata."""
    target = raw_path(raw_dir, source)
    meta_file = meta_path(raw_dir, source)
    if target.exists() and meta_file.exists() and not refresh:
        return json.loads(meta_file.read_text(encoding="utf-8"))

    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_suffix(target.suffix + ".part")
    for attempt in range(1, attempts + 1):
        try:
            sha = hashlib.sha256()
            size = 0
            with (
                httpx.stream(
                    "GET", source.url, headers=_HEADERS, timeout=300, follow_redirects=True
                ) as r,
                tmp.open("wb") as fh,
            ):
                r.raise_for_status()
                last_modified = r.headers.get("Last-Modified", "")
                for chunk in r.iter_bytes(1 << 20):
                    fh.write(chunk)
                    sha.update(chunk)
                    size += len(chunk)
            if size < source.min_bytes:
                raise ValueError(f"{source.key}: only {size} bytes, expected >= {source.min_bytes}")
            tmp.replace(target)
            meta = {
                "key": source.key,
                "url": source.url,
                "publisher": source.publisher,
                "dataset": source.dataset,
                "licence": source.licence,
                "bytes": size,
                "sha256": sha.hexdigest(),
                "last_modified": last_modified,
                "downloaded_at": datetime.now(UTC).isoformat(timespec="seconds"),
            }
            meta_file.write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
            log.info("downloaded %s (%.1f MB)", source.key, size / 1e6)
            return meta
        except (httpx.HTTPError, ValueError) as exc:
            # data.gov.hr answers 502 under load; back off and retry
            wait = min(60, 5 * attempt)
            log.warning("%s attempt %d/%d failed: %s; retrying in %ds",
                        source.key, attempt, attempts, exc, wait)
            if attempt == attempts:
                raise
            time.sleep(wait)
    raise RuntimeError("unreachable")
