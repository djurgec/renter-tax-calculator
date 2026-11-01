"""Stream the DGU INSPIRE administrative units (GML inside a ZIP).

AdministrativeUnit.gml (~600 MB uncompressed) holds every unit of the official register of
spatial units with its parent: country > county (2ndOrder) > municipality or town (3rdOrder)
> settlement (4thOrder) > statistical and census districts. The address register gives each
address a settlement code, so settlement -> municipality comes straight from here, with no
guessing from names or postcodes. Geometry is skipped.
"""

import re
from collections.abc import Iterator
from dataclasses import dataclass, field
from pathlib import Path
from zipfile import ZipFile

from ..normalize import county_key, municipality_key
from .municipalities import MunicipalityIndex
from .parse_dgu import first_match, iter_members

MEMBER = "AdministrativeUnit.gml"
_UNIT_ID = re.compile(r'<au:AdministrativeUnit gml:id="([^"]+)"')
_LEVEL = re.compile(r'<au:nationalLevel[^>]*AdministrativeHierarchyLevel/(\w+)"')
_CODE = re.compile(r"<au:nationalCode>([^<]+)</au:nationalCode>")
_NAME = re.compile(r"<gn:text>([^<]+)</gn:text>")
_UPPER = re.compile(r'<au:upperLevelUnit[^>]*xlink:href="#?([^"]+)"')
_KEEP = {"2ndOrder", "3rdOrder", "4thOrder"}  # county, municipality, settlement


@dataclass(frozen=True)
class AdminUnit:
    id: str
    level: str
    code: str
    name: str
    upper: str


def iter_units(zip_path: Path) -> Iterator[AdminUnit]:
    """Counties, municipalities and settlements; the finer districts are skipped."""
    with ZipFile(zip_path) as zf:
        for m in iter_members(zf, MEMBER):
            level = first_match(_LEVEL, m)
            if level in _KEEP:
                yield AdminUnit(id=first_match(_UNIT_ID, m), level=level,
                                code=first_match(_CODE, m), name=first_match(_NAME, m),
                                upper=first_match(_UPPER, m))


@dataclass
class SettlementRegister:
    """Settlement code (as in the address register) -> Porezna municipality code."""

    municipality_of: dict[str, int] = field(default_factory=dict)
    settlements: int = 0
    municipalities: int = 0
    unmatched_municipalities: list[str] = field(default_factory=list)
    orphan_settlements: list[str] = field(default_factory=list)

    def lookup(self, settlement_code: str) -> int | None:
        return self.municipality_of.get(settlement_code)


def build_register(units: Iterator[AdminUnit], master: MunicipalityIndex) -> SettlementRegister:
    by_id: dict[str, AdminUnit] = {}
    settlements: list[AdminUnit] = []
    for u in units:
        by_id[u.id] = u
        if u.level == "4thOrder":
            settlements.append(u)

    reg = SettlementRegister(settlements=len(settlements))
    # municipality unit -> Porezna code, by name within its county (names repeat across
    # counties: two Otok, two Privlaka, two Sveta Nedelja)
    porezna_code: dict[str, int] = {}
    for u in by_id.values():
        if u.level != "3rdOrder":
            continue
        reg.municipalities += 1
        county = by_id.get(u.upper)
        code = master.by_county_and_key(county_key(county.name if county else ""),
                                        municipality_key(u.name))
        if code is None:
            reg.unmatched_municipalities.append(f"{u.name} ({county.name if county else '?'})")
        else:
            porezna_code[u.id] = code

    for s in settlements:
        code = porezna_code.get(s.upper)
        if code is None:
            reg.orphan_settlements.append(f"{s.name} ({s.code})")
        else:
            reg.municipality_of[s.code] = code
    return reg
