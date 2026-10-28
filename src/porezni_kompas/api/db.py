"""Read-only access to porezni_kompas.sqlite.

The ETL publishes a new file by atomic rename and never edits one in place, so each
request opens the current file as immutable: no locking, no journal.
"""

import os
import sqlite3
from collections.abc import Iterator
from pathlib import Path

from fastapi import Request

DEFAULT_DB_PATH = Path("data/build/porezni_kompas.sqlite")
REPO_ROOT = Path(__file__).resolve().parents[3]  # src/porezni_kompas/api/db.py


def db_path_from_env() -> Path:
    """PK_DB_PATH, else data/build/ under the working directory, else under the repo."""
    if "PK_DB_PATH" in os.environ:
        return Path(os.environ["PK_DB_PATH"])
    if DEFAULT_DB_PATH.exists():
        return DEFAULT_DB_PATH
    return REPO_ROOT / DEFAULT_DB_PATH


def connect(path: Path) -> sqlite3.Connection:
    con = sqlite3.connect(f"{path.resolve().as_uri()}?mode=ro&immutable=1", uri=True,
                          check_same_thread=False)
    con.row_factory = sqlite3.Row
    return con


def get_db(request: Request) -> Iterator[sqlite3.Connection]:
    con = connect(request.app.state.db_path)
    try:
        yield con
    finally:
        con.close()
