"""Address autocomplete: FTS5 trigram over street labels, re-ranked in Python.

A query like "šercera 4 dubrovnik" is split into text tokens and a house number. The
text finds streets; the number then picks the address on each street.
"""

import math
import re
import sqlite3
from dataclasses import dataclass

from rapidfuzz import fuzz

from ..normalize import fold

MAX_CANDIDATES = 5000
_HOUSE = re.compile(r"^\d{1,4}[A-Z]?$")
_POSTCODE = re.compile(r"^\d{5}$")


@dataclass
class ParsedQuery:
    tokens: list[str]
    house_number: str | None
    postcode: str | None

    @property
    def text(self) -> str:
        return " ".join(self.tokens)


def parse_query(q: str) -> ParsedQuery:
    """The last short number is the house number ('Ulica 204 vukovarske brigade 12' -> 12)."""
    tokens = fold(q).split()
    postcode = next((t for t in tokens if _POSTCODE.match(t)), None)
    tokens = [t for t in tokens if t != postcode]
    house = next((t for t in reversed(tokens) if _HOUSE.match(t)), None)
    if house is not None:
        i = len(tokens) - 1 - tokens[::-1].index(house)
        tokens = tokens[:i] + tokens[i + 1 :]
    return ParsedQuery(tokens=tokens, house_number=house, postcode=postcode)


def fts_query(tokens: list[str]) -> str | None:
    """Trigram FTS needs at least 3 characters per term; shorter ones only affect ranking."""
    terms = [f'"{t}"' for t in tokens if len(t) >= 3]
    return " AND ".join(terms) or None


def _score(pq: ParsedQuery, label_key: str, street_key: str, address_count: int) -> float:
    words = label_key.split()
    street_words = street_key.split()
    # whole-word prefix hits beat substring hits ("ilica" in ILICA, not in MILICA)
    word_hits = sum(any(w.startswith(t) for w in words) for t in pq.tokens)
    street_hits = sum(any(w.startswith(t) for w in street_words) for t in pq.tokens)
    exact_street = street_key == pq.text or street_key.endswith(" " + pq.text)
    return (40 * word_hits / max(len(pq.tokens), 1)
            + 10 * street_hits / max(len(pq.tokens), 1)
            + 25 * exact_street
            + 0.3 * fuzz.token_set_ratio(pq.text, label_key)
            + 4 * math.log10(1 + address_count))


def search(con: sqlite3.Connection, q: str, limit: int = 10) -> list[dict]:
    pq = parse_query(q)
    match = fts_query(pq.tokens)
    if match is None:
        return []
    sql = ("SELECT s.id, s.label, s.street_key, s.postcode, s.address_count, "
           "s.municipality_code, s.resolution, m.name AS municipality, m.county "
           "FROM street_fts JOIN street s ON s.id = street_fts.rowid "
           "LEFT JOIN municipality m ON m.code = s.municipality_code "
           "WHERE street_fts MATCH ?")
    params: list = [match]
    if pq.postcode:
        sql += " AND s.postcode = ?"
        params.append(pq.postcode)
    rows = con.execute(sql + f" LIMIT {MAX_CANDIDATES}", params).fetchall()
    ranked = sorted(rows, reverse=True,
                    key=lambda r: _score(pq, fold(r["label"]), r["street_key"],
                                         r["address_count"]))[:limit]
    return [_result(con, r, pq.house_number) for r in ranked]


def _result(con: sqlite3.Connection, street: sqlite3.Row, house_number: str | None) -> dict:
    municipality = None
    if street["municipality_code"] is not None:
        municipality = {"code": street["municipality_code"], "name": street["municipality"],
                        "county": street["county"]}
    out = {"kind": "street", "street_id": street["id"], "label": street["label"],
           "address_count": street["address_count"], "municipality": municipality,
           "needs_municipality": municipality is None}
    if house_number:
        addr = find_house(con, street["id"], house_number)
        if addr:
            out.update(kind="address", address_id=addr["id"], house_number=addr["house_number"],
                       label=label_with_number(street["label"], addr["house_number"]))
    return out


def find_house(con: sqlite3.Connection, street_id: int, house_number: str):
    """Exact house number first ('12A'), then the plain number ('12' for '12A')."""
    rows = con.execute("SELECT id, house_number, house_int FROM address WHERE street_id = ? "
                       "AND house_int = ? ORDER BY house_number",
                       (street_id, int(re.match(r"\d+", house_number).group()))).fetchall()
    for r in rows:
        if (r["house_number"] or "").upper().replace(" ", "") == house_number:
            return r
    return rows[0] if rows else None


def label_with_number(street_label: str, house_number: str) -> str:
    """'Ilica, Zagreb, 10000 Zagreb' -> 'Ilica 1, Zagreb, 10000 Zagreb'."""
    street, _, rest = street_label.partition(", ")
    return f"{street} {house_number}, {rest}" if rest else f"{street} {house_number}"


def house_numbers(con: sqlite3.Connection, street_id: int) -> list[dict]:
    rows = con.execute("SELECT id, house_number FROM address WHERE street_id = ? "
                       "ORDER BY house_int, house_number", (street_id,)).fetchall()
    return [{"address_id": r["id"], "house_number": r["house_number"]} for r in rows]
