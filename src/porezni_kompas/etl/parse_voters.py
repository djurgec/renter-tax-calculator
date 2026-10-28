"""Voter register by address (MPUDT): the bridge settlement -> municipality.

The file lists only addresses with at least one registered voter, so it is used
for place names and their municipality, not as the address list itself.
"""

import csv
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

from ..normalize import county_key, municipality_key, place_key


@dataclass
class VoterIndex:
    # (county_key, settlement_key) -> {municipality_key}
    county_settlement: dict = field(default_factory=lambda: defaultdict(set))
    # settlement_key -> {(county_key, municipality_key)}
    settlement: dict = field(default_factory=lambda: defaultdict(set))
    # municipality_key -> {(county_key, county display name)}
    municipality_counties: dict = field(default_factory=lambda: defaultdict(set))
    # (county_key, municipality_key, settlement_key) -> {street_key}
    streets: dict = field(default_factory=lambda: defaultdict(set))
    rows: int = 0


def parse_voters(path: Path) -> VoterIndex:
    idx = VoterIndex()
    with path.open(encoding="cp1250", newline="") as fh:
        for r in csv.DictReader(fh, delimiter=";"):
            idx.rows += 1
            c = county_key(r["ZUPANIJA_NAZIV"])
            m = municipality_key(r["GROP_NAZIV"])
            s = place_key(r["NASELJE_NAZIV"])
            idx.county_settlement[(c, s)].add(m)
            idx.settlement[s].add((c, m))
            idx.municipality_counties[m].add((c, r["ZUPANIJA_NAZIV"].strip().title()))
            idx.streets[(c, m, s)].add(place_key(r["ULICA_NAZIV"]))
    return idx
