"""Find the flat-rate (paušal) rule that applies to an address.

Precedence, most specific first:
    house-number range on the street -> street (with even/odd side)
    -> settlement -> municipality
"""

from dataclasses import dataclass, field

LEVELS = ("house_range", "street", "settlement", "municipality")


@dataclass(frozen=True)
class PausalRule:
    id: int
    municipality_code: int
    settlement_key: str
    street_key: str
    level: str
    house_from: int | None = None
    house_to: int | None = None
    parity: str | None = None  # even | odd | None
    rate_bed: float | None = None
    rate_camp_unit: float | None = None
    rate_robinson: float | None = None
    source_ambiguous: bool = False  # Porezna row could belong to two municipalities


@dataclass
class RuleMatch:
    rule: PausalRule | None
    level: str | None
    warnings: list[str] = field(default_factory=list)
    alternatives: list[PausalRule] = field(default_factory=list)


def _parity_ok(rule: PausalRule, number: int | None) -> bool:
    if rule.parity is None:
        return True
    if number is None:
        return False
    return (number % 2 == 0) == (rule.parity == "even")


def _settlement_ok(rule: PausalRule, settlement_key: str) -> bool:
    return not rule.settlement_key or rule.settlement_key == settlement_key


def select_rule(rules: list[PausalRule], settlement_key: str, street_key: str,
                house_number: int | None) -> RuleMatch:
    """`rules` must all belong to the address's municipality."""
    street_rules = [r for r in rules if r.level in ("house_range", "street")
                    and r.street_key == street_key and _settlement_ok(r, settlement_key)]

    ranges = [r for r in street_rules if r.level == "house_range"]
    if ranges and house_number is not None:
        hits = [r for r in ranges if r.house_from <= house_number <= r.house_to
                and _parity_ok(r, house_number)]
        if hits:
            return _pick(hits, "house_range")

    plain = [r for r in street_rules if r.level == "street" and _parity_ok(r, house_number)]
    if plain:
        return _pick(plain, "street")

    warnings = []
    if ranges:
        warnings.append("house_number_outside_listed_ranges")
    elif any(r.level == "street" for r in street_rules):
        warnings.append("house_number_needed_for_even_odd_rule")

    settlement_rules = [r for r in rules if r.level == "settlement"
                        and r.settlement_key == settlement_key]
    if settlement_rules:
        m = _pick(settlement_rules, "settlement")
        m.warnings = warnings + m.warnings
        return m

    municipality_rules = [r for r in rules if r.level == "municipality"]
    if municipality_rules:
        m = _pick(municipality_rules, "municipality")
        m.warnings = warnings + m.warnings
        return m

    if rules:
        # the municipality only lists some settlements/streets and this one is not among them
        warnings.append("address_not_listed_in_municipality_table")
    else:
        warnings.append("no_rule_for_municipality")
    return RuleMatch(rule=None, level=None, warnings=warnings)


def _pick(candidates: list[PausalRule], level: str) -> RuleMatch:
    first = candidates[0]
    distinct = {(r.rate_bed, r.rate_camp_unit, r.rate_robinson) for r in candidates}
    warnings = []
    alternatives = []
    if any(r.source_ambiguous for r in candidates):
        warnings.append("official_table_ambiguous_for_this_municipality")
    if len(distinct) > 1:
        warnings.append("several_rates_match")
        alternatives = candidates[1:]
    return RuleMatch(rule=first, level=level, warnings=warnings, alternatives=alternatives)


def yearly_pausal(rule: PausalRule, beds: int = 0, camp_units: int = 0,
                  robinson_units: int = 0) -> tuple[float, list[str]]:
    """Yearly amount in EUR, plus the unit types whose rate is not published for this rule.

    A missing rate is never replaced by another one: the caller must show it as unknown.
    """
    total, missing = 0.0, []
    for count, rate, label in ((beds, rule.rate_bed, "bed"),
                               (camp_units, rule.rate_camp_unit, "camp_unit"),
                               (robinson_units, rule.rate_robinson, "robinson_unit")):
        if count <= 0:
            continue
        if rate is None:
            missing.append(label)
        else:
            total += count * rate
    return round(total, 2), missing
