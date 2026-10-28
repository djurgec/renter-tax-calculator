from porezni_kompas.rules.pausal import PausalRule, select_rule, yearly_pausal

M = 1  # municipality code


def rule(id, level, settlement="", street="", **kw):
    return PausalRule(id=id, municipality_code=M, settlement_key=settlement, street_key=street,
                      level=level, **kw)


RULES = [
    rule(1, "municipality", rate_bed=100.0),
    rule(2, "settlement", "DUBROVNIK", rate_bed=150.0),
    rule(3, "street", "DUBROVNIK", "STRADUN", rate_bed=250.0),
    rule(4, "house_range", "DUBROVNIK", "DR ANTE SERCERA", house_from=1, house_to=6,
         rate_bed=100.0),
    rule(5, "street", "DUBROVNIK", "OBALA", parity="even", rate_bed=200.0),
    rule(6, "street", "DUBROVNIK", "OBALA", parity="odd", rate_bed=180.0),
]


def test_most_specific_rule_wins():
    assert select_rule(RULES, "DUBROVNIK", "STRADUN", 3).rule.id == 3
    assert select_rule(RULES, "DUBROVNIK", "DR ANTE SERCERA", 4).rule.id == 4
    assert select_rule(RULES, "DUBROVNIK", "NEKA ULICA", 4).rule.id == 2
    assert select_rule(RULES, "GRUZ", "NEKA ULICA", 4).rule.id == 1


def test_house_number_outside_ranges_falls_back_with_warning():
    m = select_rule(RULES, "DUBROVNIK", "DR ANTE SERCERA", 40)
    assert m.rule.id == 2
    assert "house_number_outside_listed_ranges" in m.warnings


def test_even_and_odd_sides():
    assert select_rule(RULES, "DUBROVNIK", "OBALA", 10).rule.id == 5
    assert select_rule(RULES, "DUBROVNIK", "OBALA", 11).rule.id == 6


def test_street_only_municipality_without_match():
    only_streets = [rule(1, "street", "X", "A", rate_bed=50.0)]
    m = select_rule(only_streets, "X", "B", 1)
    assert m.rule is None
    assert "address_not_listed_in_municipality_table" in m.warnings


def test_ambiguous_source_is_flagged():
    rules = [rule(1, "municipality", rate_bed=30.0, source_ambiguous=True),
             rule(2, "municipality", rate_bed=50.0, source_ambiguous=True)]
    m = select_rule(rules, "S", "U", 1)
    assert "official_table_ambiguous_for_this_municipality" in m.warnings
    assert "several_rates_match" in m.warnings
    assert m.alternatives[0].id == 2


def test_missing_rate_is_reported_not_invented():
    r = rule(1, "house_range", rate_bed=100.0, rate_camp_unit=None, rate_robinson=None)
    total, missing = yearly_pausal(r, beds=4, robinson_units=2)
    assert total == 400.0
    assert missing == ["robinson_unit"]


def test_more_beds_never_cost_less():
    r = rule(1, "municipality", rate_bed=60.0)
    amounts = [yearly_pausal(r, beds=b)[0] for b in range(0, 30)]
    assert amounts == sorted(amounts)
