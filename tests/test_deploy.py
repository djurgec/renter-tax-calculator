"""Production settings: frontend served by the API, rate limit, port from the host."""

import pytest
from conftest import build_fixture_db
from fastapi.testclient import TestClient

from porezni_kompas.api import main


@pytest.fixture(scope="module")
def db(tmp_path_factory):
    path = tmp_path_factory.mktemp("db") / "porezni_kompas.sqlite"
    build_fixture_db(path)
    return path


@pytest.fixture
def web_dir(tmp_path):
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text("<!doctype html><title>PorezniKompas</title>")
    (tmp_path / "assets" / "index-abc123.js").write_text("console.log(1)")
    (tmp_path / "favicon.svg").write_text("<svg/>")
    return tmp_path


def test_frontend_and_api_share_one_origin(db, web_dir, monkeypatch):
    monkeypatch.setenv("PK_WEB_DIR", str(web_dir))
    client = TestClient(main.create_app(db))

    assert client.get("/api/health").json()["status"] == "ok"
    home = client.get("/")
    assert "PorezniKompas" in home.text and home.headers["cache-control"] == "no-cache"
    asset = client.get("/assets/index-abc123.js")
    assert asset.text == "console.log(1)" and "immutable" in asset.headers["cache-control"]
    assert client.get("/favicon.svg").text == "<svg/>"
    # the app's own routes load index.html, so a reload on them works
    assert "PorezniKompas" in client.get("/opcine/981").text
    # unknown API paths stay JSON 404s, and files outside web/ are not reachable
    assert client.get("/api/nope").status_code == 404
    assert "PorezniKompas" in client.get("/../pyproject.toml").text
    assert client.get("/api/docs").status_code == 200


def test_frontend_is_off_by_default(db, monkeypatch):
    monkeypatch.delenv("PK_WEB_DIR", raising=False)
    assert TestClient(main.create_app(db)).get("/").status_code == 404


def test_missing_build_fails_at_startup(db, tmp_path, monkeypatch):
    monkeypatch.setenv("PK_WEB_DIR", str(tmp_path / "missing"))
    with pytest.raises(RuntimeError, match="npm run build"):
        main.create_app(db)


def test_rate_limit_per_client(db, monkeypatch):
    monkeypatch.setenv("PK_RATE_LIMIT", "3")
    client = TestClient(main.create_app(db))
    codes = [client.get("/api/municipalities").status_code for _ in range(5)]
    assert codes == [200, 200, 200, 429, 429]
    # health checks are never limited, so the host does not mark the service as down
    assert client.get("/api/health").status_code == 200


def test_port_from_host(monkeypatch):
    seen = {}
    monkeypatch.setattr("uvicorn.run", lambda *a, **kw: seen.update(kw))
    monkeypatch.delenv("PK_PORT", raising=False)
    monkeypatch.setenv("PORT", "10000")
    main.run()
    assert seen["port"] == 10000
    monkeypatch.setenv("PK_PORT", "8001")
    main.run()
    assert seen["port"] == 8001
