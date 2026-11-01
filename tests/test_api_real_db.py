"""Checks against the database built by the ETL; skipped when it has not been built."""

import json
import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from porezni_kompas.api.main import create_app

DB = Path(__file__).parents[1] / "data" / "build" / "porezni_kompas.sqlite"
pytestmark = pytest.mark.skipif(not DB.exists(), reason="run porezni-kompas-etl first")


@pytest.fixture(scope="module")
def client():
    return TestClient(create_app(DB))


@pytest.mark.parametrize(("q", "label", "rate_bed", "level"), [
    ("placa 1 dubrovnik", "Placa 1, Dubrovnik, 20000 Dubrovnik", 250.0, "street"),
    ("ilica 1 zagreb", "Ilica 1, Zagreb, 10000 Zagreb", 199.08, "municipality"),
    ("obala kneza branimira 2 zadar", "Obala kneza Branimira 2, Zadar, 23000 Zadar", 100.0,
     "municipality"),
])
def test_search_then_calculate(client, q, label, rate_bed, level):
    hit = client.get("/api/addresses/search", params={"q": q}).json()[0]
    assert hit["label"] == label
    r = client.post("/api/calculate", json={"address_id": hit["address_id"], "beds": 1}).json()
    assert r["pausal"]["level"] == level
    assert r["pausal"]["rule"]["rates"]["bed"] == rate_bed


def test_runtime_rule_matches_the_etl(client):
    """The API selects rules at request time; it must agree with what the ETL stored."""
    con = sqlite3.connect(DB)
    sample = con.execute(
        "SELECT a.id, a.pausal_rule_id, a.pausal_level, a.pausal_warnings FROM address a "
        "JOIN street s ON s.id = a.street_id WHERE s.municipality_code IS NOT NULL "
        "ORDER BY substr(a.id, -3), a.id LIMIT 1500").fetchall()  # spread over the country
    # plus every address on a street-, range- or parity-level rule, the risky cases
    sample += con.execute("SELECT id, pausal_rule_id, pausal_level, pausal_warnings FROM address "
                          "WHERE pausal_level IN ('street', 'house_range') LIMIT 1500").fetchall()
    con.close()
    for aid, rule_id, level, warnings in sample:
        r = client.post("/api/calculate", json={"address_id": aid, "beds": 1}).json()
        got = r["pausal"]["rule"]["id"] if r["pausal"]["rule"] else None
        assert (got, r["pausal"]["level"]) == (rule_id, level), aid
        expected = json.loads(warnings) if warnings else []
        assert [w for w in r["warnings"] if w in expected] == expected, aid


@pytest.mark.parametrize(("code", "rate_bed", "source_row"), [
    # Općina Otok (Splitsko-dalmatinska): its decision of 27.11.2025 sets 20 EUR from 2026
    (3140, 20.0, 1015),
    # Grad Otok (Vukovarsko-srijemska): the other "Otok" row, by elimination
    (5355, 60.0, 1016),
    # Općina Sveta Nedelja (Istarska): its decision of 24.02.2025 sets 50 EUR
    (4324, 50.0, 1272),
    (4367, 30.0, 1271),
])
def test_duplicate_name_municipalities(client, code, rate_bed, source_row):
    """The flat-rate table names these municipalities ambiguously; see the overrides file."""
    con = sqlite3.connect(DB)
    aid = con.execute("SELECT a.id FROM address a JOIN street s ON s.id = a.street_id "
                      "WHERE s.municipality_code = ? LIMIT 1", (code,)).fetchone()[0]
    con.close()
    r = client.post("/api/calculate", json={"address_id": aid, "beds": 1}).json()
    assert r["municipality"]["code"] == code
    assert (r["pausal"]["rule"]["rates"]["bed"], r["pausal"]["rule"]["source_row"]) == (
        rate_bed, source_row)
    assert "official_table_row_assigned_by_inference" not in r["warnings"]
