"""Calculation service: address + inputs -> flat-rate tax, property tax, provenance.

The rule is selected at request time with the same `select_rule` the ETL uses, so a
municipality chosen by the user (ambiguous settlements) gets the right rules.
"""

import json
import sqlite3

from ..rules.pausal import PausalRule, select_rule, yearly_pausal
from .search import label_with_number

YEAR = 2026


class NotFound(Exception):
    pass


class MunicipalityRequired(Exception):
    """The address could belong to several municipalities and none was chosen."""

    def __init__(self, candidates: list[dict]):
        super().__init__("municipality_code is required for this address")
        self.candidates = candidates


class InvalidMunicipality(Exception):
    pass


def municipality_ref(con: sqlite3.Connection, code: int) -> dict | None:
    r = con.execute("SELECT code, name, county FROM municipality WHERE code = ?",
                    (code,)).fetchone()
    return dict(r) if r else None


def get_address(con: sqlite3.Connection, address_id: str) -> dict:
    r = con.execute(
        "SELECT a.id, a.street_id, a.house_number, a.house_int, a.lat, a.lon, s.street, "
        "s.street_key, s.settlement, s.settlement_key, s.postcode, s.label, "
        "s.municipality_code, s.candidate_codes, s.resolution "
        "FROM address a JOIN street s ON s.id = a.street_id WHERE a.id = ?",
        (address_id,)).fetchone()
    if r is None:
        raise NotFound(f"address {address_id} not found")
    code = r["municipality_code"]
    candidates = json.loads(r["candidate_codes"]) if r["candidate_codes"] else []
    return {
        "id": r["id"], "street_id": r["street_id"], "street": r["street"],
        "house_number": r["house_number"], "settlement": r["settlement"],
        "postcode": r["postcode"], "label": label_with_number(r["label"], r["house_number"]),
        "lat": r["lat"], "lon": r["lon"],
        "municipality": municipality_ref(con, code) if code is not None else None,
        "candidates": [m for c in candidates if (m := municipality_ref(con, c))],
        "resolution": r["resolution"],
        # internal, used by the calculation only
        "_house_int": r["house_int"], "_settlement_key": r["settlement_key"],
        "_street_key": r["street_key"],
    }


def public_address(address: dict) -> dict:
    return {k: v for k, v in address.items() if not k.startswith("_")}


def choose_municipality(con: sqlite3.Connection, address: dict, requested: int | None) -> int:
    resolved = address["municipality"]["code"] if address["municipality"] else None
    candidate_codes = [m["code"] for m in address["candidates"]]
    if requested is None:
        if resolved is None:
            raise MunicipalityRequired(address["candidates"])
        return resolved
    if resolved is not None and requested != resolved:
        raise InvalidMunicipality(f"address belongs to municipality {resolved}")
    if candidate_codes and requested not in candidate_codes:
        raise InvalidMunicipality(f"municipality must be one of {candidate_codes}")
    if municipality_ref(con, requested) is None:
        raise InvalidMunicipality(f"municipality {requested} not found")
    return requested  # 'unknown' addresses accept any existing municipality


def load_rules(con: sqlite3.Connection, code: int) -> tuple[list[PausalRule], dict[int, dict]]:
    """Rules for the rules engine, plus the display rows keyed by rule id."""
    rows = con.execute("SELECT * FROM pausal_rule WHERE municipality_code = ? AND year = ? "
                       "ORDER BY source_row, id", (code, YEAR)).fetchall()
    rules = [PausalRule(id=r["id"], municipality_code=code,
                        settlement_key=r["settlement_key"] or "",
                        street_key=r["street_key"] or "", level=r["level"],
                        house_from=r["house_from"], house_to=r["house_to"], parity=r["parity"],
                        rate_bed=r["rate_bed"], rate_camp_unit=r["rate_camp_unit"],
                        rate_robinson=r["rate_robinson"],
                        source_ambiguous=bool(r["source_ambiguous"]))
             for r in rows]
    return rules, {r["id"]: rule_out(r) for r in rows}


def rule_out(r: sqlite3.Row) -> dict:
    return {
        "id": r["id"], "level": r["level"], "settlement": r["settlement"] or None,
        "street": r["street"] or None, "house_from": r["house_from"],
        "house_to": r["house_to"], "parity": r["parity"],
        "rates": {"bed": r["rate_bed"], "camp_unit": r["rate_camp_unit"],
                  "robinson_unit": r["rate_robinson"]},
        "category": r["category"], "source_row": r["source_row"],
        "source_ambiguous": bool(r["source_ambiguous"]),
        "assignment_inferred": bool(r["assignment_inferred"]),
    }


def legal_range(con: sqlite3.Connection, category: str | None) -> dict | None:
    if category is None:
        return None
    r = con.execute("SELECT * FROM legal_range WHERE category = ?", (category,)).fetchone()
    return dict(r) if r else None


def property_tax_rate(con: sqlite3.Connection, code: int, year: int) -> dict | None:
    r = con.execute("SELECT * FROM property_tax WHERE municipality_code = ? AND year = ?",
                    (code, year)).fetchone()
    if r is None:
        return None
    return {"year": year, "rate_min": r["rate_min"], "rate_max": r["rate_max"],
            "is_range": bool(r["is_range"]), "raw": r["raw"],
            "administered_by": r["administered_by"]}


def provenance(con: sqlite3.Connection, key: str, source_row: int | None = None) -> dict | None:
    r = con.execute("SELECT * FROM dataset_meta WHERE key = ?", (key,)).fetchone()
    if r is None:
        return None
    return {"dataset": key, "publisher": r["publisher"], "title": r["dataset"], "url": r["url"],
            "licence": r["licence"], "downloaded_at": r["downloaded_at"],
            "source_row": source_row}


def _pausal(con, address: dict, code: int, beds: int, camp_units: int,
            robinson_units: int) -> tuple[dict, list[str]]:
    rules, display = load_rules(con, code)
    match = select_rule(rules, address["_settlement_key"], address["_street_key"],
                        address["_house_int"])
    counts = {"bed": beds, "camp_unit": camp_units, "robinson_unit": robinson_units}
    lines, amount, missing = [], None, []
    if match.rule:
        amount, missing = yearly_pausal(match.rule, beds, camp_units, robinson_units)
        rates = display[match.rule.id]["rates"]
        for unit, count in counts.items():
            if count > 0:
                rate = rates[unit]
                lines.append({"unit": unit, "count": count, "rate": rate,
                              "amount": round(count * rate, 2) if rate is not None else None})
    alternatives = [{"rule": display[r.id],
                     "amount": yearly_pausal(r, beds, camp_units, robinson_units)[0]}
                    for r in match.alternatives]
    category = display[match.rule.id]["category"] if match.rule else None
    warnings = list(match.warnings)
    if match.rule and display[match.rule.id]["assignment_inferred"]:
        warnings.append("official_table_row_assigned_by_inference")
    if missing:
        warnings.append("rate_not_published_for_unit_type")
    return {"year": YEAR, "level": match.level,
            "rule": display[match.rule.id] if match.rule else None, "amount": amount,
            "lines": lines, "missing_rates": missing, "alternatives": alternatives,
            "legal_range": legal_range(con, category)}, warnings


def _property_tax(con, code: int, area_m2: float | None,
                  is_primary_residence: bool) -> tuple[dict, list[str]]:
    rate = property_tax_rate(con, code, YEAR)
    out = {"rate": rate, "previous": property_tax_rate(con, code, YEAR - 1),
           "area_m2": area_m2, "exempt": is_primary_residence,
           "amount_min": None, "amount_max": None}
    warnings = []
    if is_primary_residence:
        out["amount_min"] = out["amount_max"] = 0.0
        warnings.append("property_tax_exempt_primary_residence")
    elif area_m2 is not None and rate and rate["rate_min"] is not None:
        out["amount_min"] = round(area_m2 * rate["rate_min"], 2)
        out["amount_max"] = round(area_m2 * rate["rate_max"], 2)
        if rate["is_range"]:
            warnings.append("property_tax_depends_on_zone")
    elif area_m2 is not None:
        warnings.append("property_tax_rate_missing")
    if rate and rate["administered_by"] == "JLS":
        warnings.append("property_tax_billed_by_municipality")
    return out, warnings


def calculate(con: sqlite3.Connection, req) -> dict:
    address = get_address(con, req.address_id)
    code = choose_municipality(con, address, req.municipality_code)
    pausal, w1 = _pausal(con, address, code, req.beds, req.camp_units, req.robinson_units)
    prop, w2 = _property_tax(con, code, req.area_m2, req.is_primary_residence)

    # an ambiguous official table widens the total to cover every candidate rate
    pausal_amounts = [a for a in (pausal["amount"], *(x["amount"] for x in pausal["alternatives"]))
                      if a is not None]
    lo, hi = min(pausal_amounts, default=None), max(pausal_amounts, default=None)
    parts_min = [p for p in (lo, prop["amount_min"]) if p is not None]
    parts_max = [p for p in (hi, prop["amount_max"]) if p is not None]
    total_min = round(sum(parts_min), 2) if parts_min else None
    total_max = round(sum(parts_max), 2) if parts_max else None

    sources = [provenance(con, "porezna_pausal",
                          pausal["rule"]["source_row"] if pausal["rule"] else None),
               provenance(con, "porezna_property"), provenance(con, "dgu_addresses"),
               provenance(con, "posta"), provenance(con, "voters")]
    return {"address": public_address(address), "municipality": municipality_ref(con, code),
            "pausal": pausal, "property_tax": prop, "total_min": total_min,
            "total_max": total_max, "warnings": w1 + w2,
            "provenance": [s for s in sources if s]}
