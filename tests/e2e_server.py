"""Serve the API on the small test database, for the Playwright end-to-end tests.

The browser tests in web/e2e/ start this automatically (see web/playwright.config.ts), so
they need neither the real 180 MB database nor network access, and their expected numbers
stay fixed. Run it by hand to look at the same data: `python tests/e2e_server.py`.
"""

import os
import sys
import tempfile
from pathlib import Path

import uvicorn

sys.path.insert(0, str(Path(__file__).parent))
from conftest import build_fixture_db  # noqa: E402

from porezni_kompas.api.main import create_app  # noqa: E402


def main() -> None:
    db = Path(tempfile.mkdtemp(prefix="pk-e2e-")) / "porezni_kompas.sqlite"
    build_fixture_db(db)
    uvicorn.run(create_app(db), host="127.0.0.1", port=int(os.environ.get("PK_PORT", "8765")),
                log_level="warning")


if __name__ == "__main__":
    main()
