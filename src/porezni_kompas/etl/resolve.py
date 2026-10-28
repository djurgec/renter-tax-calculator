"""Resolve a DGU address (settlement + postcode) to a municipality code.

Chain: Hrvatska pošta (settlement + postcode -> county)
       -> voter register (county + settlement -> municipality)
       -> fallback: settlement name that exists in only one municipality.
"""

from dataclasses import dataclass

from .municipalities import MunicipalityIndex
from .parse_voters import VoterIndex


@dataclass(frozen=True)
class Resolution:
    code: int | None
    candidates: tuple[int, ...]
    method: str  # postcode_county | unique_settlement | ambiguous | unknown


class Resolver:
    def __init__(self, posta: dict, voters: VoterIndex, master: MunicipalityIndex):
        self.posta, self.voters, self.master = posta, voters, master
        self._cache: dict[tuple[str, str], Resolution] = {}

    def resolve(self, settlement_key: str, postcode: str) -> Resolution:
        k = (settlement_key, postcode)
        if k not in self._cache:
            self._cache[k] = self._resolve(settlement_key, postcode)
        return self._cache[k]

    def _codes(self, pairs) -> tuple[int, ...]:
        codes = {self.master.by_county_and_key(c, m) for c, m in pairs}
        return tuple(sorted(c for c in codes if c is not None))

    def _resolve(self, s: str, pc: str) -> Resolution:
        county = self.posta.get((s, pc))
        if county:
            muns = self.voters.county_settlement.get((county, s), set())
            codes = self._codes((county, m) for m in muns)
            if len(codes) == 1:
                return Resolution(codes[0], codes, "postcode_county")
            if len(codes) > 1:
                return Resolution(None, codes, "ambiguous")
        pairs = self.voters.settlement.get(s, set())
        codes = self._codes(pairs)
        if len(codes) == 1:
            return Resolution(codes[0], codes, "unique_settlement")
        if len(codes) > 1:
            return Resolution(None, codes, "ambiguous")
        return Resolution(None, (), "unknown")
