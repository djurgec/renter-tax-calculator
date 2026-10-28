"""Municipality master list keyed by the official Porezna municipality code.

Names are not unique (two Privlaka, two Sveta Nedelja, two Otok), so every join
goes through the code. Hints in parentheses in the Porezna tables tell the
duplicates apart: "Privlaka (ZD)", "Otok (Sinj)", "Sveta Nedjelja (PU)".
"""

import csv
import logging
from dataclasses import dataclass
from pathlib import Path

from ..normalize import county_key, municipality_key, split_hint
from .parse_porezna import ConsumptionRow, PropertyRow
from .parse_voters import VoterIndex

log = logging.getLogger(__name__)

# hint in parentheses -> county key
HINT_COUNTY = {
    "ZD": "ZADARSKA",
    "VU": "VUKOVARSKO SRIJEMSKA",
    "PU": "ISTARSKA",  # Porezna office Pula
    "ZG": "ZAGREBACKA",
    "SINJ": "SPLITSKO DALMATINSKA",
    "VINKOVCI": "VUKOVARSKO SRIJEMSKA",
}


@dataclass
class Municipality:
    code: int
    name: str
    key: str
    county_key: str
    county: str


class MunicipalityIndex:
    def __init__(self, municipalities: list[Municipality]):
        self.by_code = {m.code: m for m in municipalities}
        self.by_key: dict[str, list[Municipality]] = {}
        for m in municipalities:
            self.by_key.setdefault(m.key, []).append(m)

    def lookup(self, name: str, county: str | None = None) -> list[int]:
        """Codes matching a municipality name (optionally within a county)."""
        key = municipality_key(name)
        cands = self.by_key.get(key)
        if not cands and len(key) >= 12:
            # truncated names, e.g. "KASTELIR LABINCI CASTELLIERE S D"
            cands = [m for k, ms in self.by_key.items() if k.startswith(key) or key.startswith(k)
                     for m in ms]
        cands = cands or []
        if county:
            ck = county_key(county)
            in_county = [m for m in cands if m.county_key == ck]
            if in_county:
                cands = in_county
        return [m.code for m in cands]

    def by_county_and_key(self, ck: str, mk: str) -> int | None:
        for m in self.by_key.get(mk, []):
            if m.county_key == ck:
                return m.code
        return None


def build_master(property_rows: list[PropertyRow], consumption_rows: list[ConsumptionRow],
                 voters: VoterIndex) -> tuple[MunicipalityIndex, list[str]]:
    hints = {}
    for r in consumption_rows:
        _, hint = split_hint(r.raw_name)
        if hint:
            hints[r.code] = hint.upper()
    issues = []
    out = []
    for r in property_rows:
        name, hint = split_hint(r.raw_name)
        hint = (hint or hints.get(r.code, "")).upper()
        key = municipality_key(name)
        counties = sorted(voters.municipality_counties.get(key, set()))
        if len(counties) > 1 and hint in HINT_COUNTY:
            counties = [c for c in counties if c[0] == HINT_COUNTY[hint]]
        if len(counties) != 1:
            issues.append(f"county for {r.raw_name} ({r.code}) unresolved: {counties}")
            ck, county = "", ""
        else:
            ck, county = counties[0]
        out.append(Municipality(code=r.code, name=name, key=key, county_key=ck, county=county))
    return MunicipalityIndex(out), issues


def load_pausal_overrides(path: Path) -> dict[tuple[str, int], tuple[int, bool]]:
    """(raw name, block) -> (municipality code, inferred). `verified` is yes | inferred."""
    if not path.exists():
        return {}
    with path.open(encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))
    bad = [r for r in rows if r["verified"] not in ("yes", "inferred")]
    if bad:
        raise ValueError(f"{path}: 'verified' must be yes or inferred: {bad}")
    return {(r["raw_name"], int(r["block"])): (int(r["code"]), r["verified"] == "inferred")
            for r in rows}
