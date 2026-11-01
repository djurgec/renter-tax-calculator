"""Resolve a DGU address to a municipality code.

1. Official register: the address's settlement code -> its municipality, from DGU's
   administrative units (parse_dgu_units). Authoritative and complete.
2. Fallback, also used as an independent cross-check of the register:
   Hrvatska pošta (settlement + postcode -> county)
   -> voter register (county + settlement -> municipality)
   -> settlement name that exists in only one municipality.
"""

from dataclasses import dataclass

from .municipalities import MunicipalityIndex
from .parse_dgu_units import SettlementRegister
from .parse_voters import VoterIndex


@dataclass(frozen=True)
class Resolution:
    code: int | None
    candidates: tuple[int, ...]
    method: str  # register | postcode_county | unique_settlement | ambiguous | unknown
    # register vs the name-based chain: same | different | fallback_unresolved | None (no register)
    cross_check: str | None = None
    fallback_code: int | None = None


class Resolver:
    def __init__(self, posta: dict, voters: VoterIndex, master: MunicipalityIndex,
                 register: SettlementRegister | None = None):
        self.posta, self.voters, self.master = posta, voters, master
        self.register = register
        self._cache: dict[tuple[str, str, str], Resolution] = {}

    def resolve(self, settlement_key: str, postcode: str, settlement_code: str = "") -> Resolution:
        k = (settlement_key, postcode, settlement_code)
        if k not in self._cache:
            self._cache[k] = self._resolve(settlement_key, postcode, settlement_code)
        return self._cache[k]

    def _resolve(self, s: str, pc: str, settlement_code: str) -> Resolution:
        fallback = self._by_names(s, pc)
        code = self.register.lookup(settlement_code) if self.register and settlement_code else None
        if code is None:
            return fallback
        if fallback.code is None:
            check = "fallback_unresolved"
        else:
            check = "same" if fallback.code == code else "different"
        return Resolution(code, (code,), "register", check, fallback.code)

    def _codes(self, pairs) -> tuple[int, ...]:
        codes = {self.master.by_county_and_key(c, m) for c, m in pairs}
        return tuple(sorted(c for c in codes if c is not None))

    def _by_names(self, s: str, pc: str) -> Resolution:
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
