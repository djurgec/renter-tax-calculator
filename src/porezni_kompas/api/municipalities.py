"""Municipality pages: all rates for one municipality and comparison with neighbours."""

import math
import sqlite3

from ..normalize import fold
from .calculate import YEAR, NotFound, legal_range, property_tax_rate, rule_out

EARTH_KM = 6371.0


def list_municipalities(con: sqlite3.Connection, q: str | None = None) -> list[dict]:
    rows = con.execute("SELECT code, name, county, tourism_category FROM municipality "
                       "ORDER BY name").fetchall()
    out = [dict(r) for r in rows]
    if q:
        key = fold(q)
        out = [m for m in out if key in fold(m["name"])]
    return out


def municipality_detail(con: sqlite3.Connection, code: int) -> dict:
    m = con.execute("SELECT * FROM municipality WHERE code = ?", (code,)).fetchone()
    if m is None:
        raise NotFound(f"municipality {code} not found")
    rules = con.execute("SELECT * FROM pausal_rule WHERE municipality_code = ? AND year = ? "
                        "ORDER BY source_row, id", (code, YEAR)).fetchall()
    years = []
    for year in (YEAR - 1, YEAR):
        inc = con.execute("SELECT lower, higher FROM income_tax "
                          "WHERE municipality_code = ? AND year = ?", (code, year)).fetchone()
        cons = con.execute("SELECT rate FROM consumption_tax "
                           "WHERE municipality_code = ? AND year = ?", (code, year)).fetchone()
        years.append({"year": year, "property_tax": property_tax_rate(con, code, year),
                      "income_tax_lower": inc["lower"] if inc else None,
                      "income_tax_higher": inc["higher"] if inc else None,
                      "consumption_tax": cons["rate"] if cons else None})
    return {"code": m["code"], "name": m["name"], "county": m["county"],
            "tourism_category": m["tourism_category"], "lat": m["lat"], "lon": m["lon"],
            "legal_range": legal_range(con, m["tourism_category"]),
            "pausal_source_ambiguous": bool(m["pausal_source_ambiguous"]),
            "pausal_rules": [rule_out(r) for r in rules], "years": years}


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_KM * math.asin(math.sqrt(a))


def neighbours(con: sqlite3.Connection, code: int, limit: int = 8) -> list[dict]:
    """Nearest municipalities by distance between their address centroids."""
    me = con.execute("SELECT lat, lon FROM municipality WHERE code = ?", (code,)).fetchone()
    if me is None:
        raise NotFound(f"municipality {code} not found")
    if me["lat"] is None:
        return []
    others = con.execute("SELECT code, name, county, tourism_category, lat, lon "
                         "FROM municipality WHERE code != ? AND lat IS NOT NULL",
                         (code,)).fetchall()
    nearest = sorted(others, key=lambda o: haversine_km(me["lat"], me["lon"],
                                                         o["lat"], o["lon"]))[:limit]
    out = []
    for o in nearest:
        rates = {r["rate_bed"] for r in con.execute(
            "SELECT rate_bed FROM pausal_rule WHERE municipality_code = ? AND year = ? "
            "AND level = 'municipality'", (o["code"], YEAR))}
        out.append({"code": o["code"], "name": o["name"], "county": o["county"],
                    "tourism_category": o["tourism_category"],
                    "distance_km": round(haversine_km(me["lat"], me["lon"], o["lat"], o["lon"]),
                                         1),
                    # several municipality-wide rates means the official table is ambiguous
                    "pausal_rate_bed": rates.pop() if len(rates) == 1 else None,
                    "property_tax": property_tax_rate(con, o["code"], YEAR)})
    return out


def map_points(con: sqlite3.Connection) -> list[dict]:
    """Every municipality with a centroid, for the map: one point per municipality.

    `rate_bed` is the municipality-wide per-bed rate when the table has exactly one; otherwise
    it is None and `rate_min` / `rate_max` show the spread of all its rules (streets,
    settlements, house-number ranges).
    """
    rows = con.execute(
        "SELECT m.code, m.name, m.tourism_category, m.lat, m.lon, "
        "  (SELECT group_concat(DISTINCT r.rate_bed) FROM pausal_rule r "
        "     WHERE r.municipality_code = m.code AND r.year = ? AND r.level = 'municipality' "
        "     AND r.rate_bed IS NOT NULL) AS wide, "
        "  (SELECT min(r.rate_bed) FROM pausal_rule r "
        "     WHERE r.municipality_code = m.code AND r.year = ?) AS lo, "
        "  (SELECT max(r.rate_bed) FROM pausal_rule r "
        "     WHERE r.municipality_code = m.code AND r.year = ?) AS hi "
        "FROM municipality m WHERE m.lat IS NOT NULL ORDER BY m.code",
        (YEAR, YEAR, YEAR)).fetchall()
    out = []
    for r in rows:
        wide = [float(v) for v in r["wide"].split(",")] if r["wide"] else []
        out.append({"code": r["code"], "name": r["name"],
                    "tourism_category": r["tourism_category"],
                    "lat": round(r["lat"], 4), "lon": round(r["lon"], 4),
                    "rate_bed": wide[0] if len(wide) == 1 else None,
                    "rate_min": r["lo"], "rate_max": r["hi"]})
    return out
