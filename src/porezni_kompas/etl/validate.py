"""Quality gates: the new database is published only if every check passes."""

# Legal per-bed ranges by tourism development category (Porezna uprava, from 2025)
LEGAL_RANGES = {
    "I": (100.0, 300.0, 200.0),
    "II": (70.0, 200.0, 135.0),
    "III": (30.0, 150.0, 90.0),
    "IV": (20.0, 100.0, 60.0),
    "0": (20.0, 100.0, 60.0),
}

THRESHOLDS = {
    "addresses_min": 1_600_000,
    "address_resolved_share_min": 0.999,
    "street_rules_matched_share_min": 0.95,
    "municipalities_expected": 556,
    "pausal_municipalities_covered_min": 550,
    "coordinates_outside_croatia_max": 0,
    # official register vs the name-based chain (postcode + voter register), where both answer
    "register_agreement_min": 0.999,
}

# lat/lon bounding box of Croatia with a small margin
CROATIA_BBOX = (42.2, 13.3, 46.7, 19.6)


def evaluate(stats: dict) -> dict:
    checks = []

    def check(name: str, ok: bool, detail):
        checks.append({"check": name, "ok": bool(ok), "detail": detail})

    t = THRESHOLDS
    check("address count", stats["addresses"] >= t["addresses_min"], stats["addresses"])
    share = stats["addresses_resolved"] / max(1, stats["addresses"])
    check("addresses resolved to a municipality", share >= t["address_resolved_share_min"],
          round(share, 4))
    sr = stats["street_rules_total"]
    sm = stats["street_rules_matched_exact"] + stats["street_rules_matched_fuzzy"]
    check("street-level rules found in the address data",
          sr == 0 or sm / sr >= t["street_rules_matched_share_min"],
          {"total": sr, "exact": stats["street_rules_matched_exact"],
           "fuzzy": stats["street_rules_matched_fuzzy"]})
    check("register of spatial units linked to the tax tables",
          stats["register_municipalities"] == t["municipalities_expected"]
          and not stats["register_unmatched_municipalities"]
          and not stats["register_orphan_settlements"],
          {"municipalities": stats["register_municipalities"],
           "settlements": stats["register_settlements"],
           "unmatched": stats["register_unmatched_municipalities"][:20],
           "orphans": stats["register_orphan_settlements"][:20]})
    rc = stats["register_check"]
    compared = rc.get("same", 0) + rc.get("different", 0)
    agreement = rc.get("same", 0) / compared if compared else 0.0
    check("register agrees with the name-based method",
          agreement >= t["register_agreement_min"],
          {"agreement": round(agreement, 5), **rc})
    check("all municipalities in the master list",
          stats["municipalities"] == t["municipalities_expected"], stats["municipalities"])
    check("every municipality has a county", not stats["municipality_issues"],
          stats["municipality_issues"])
    check("municipalities with a property-tax entry",
          stats["property_rows"] == t["municipalities_expected"], stats["property_rows"])
    check("municipalities covered by flat-rate rules",
          stats["pausal_municipalities"] >= t["pausal_municipalities_covered_min"],
          stats["pausal_municipalities"])
    check("per-bed amounts inside the legal range of their category",
          not stats["rates_outside_legal_range"], stats["rates_outside_legal_range"][:20])
    check("address coordinates inside Croatia",
          stats["coordinates_outside_croatia"] <= t["coordinates_outside_croatia_max"],
          stats["coordinates_outside_croatia"])
    check("every flat-rate row assigned to a municipality",
          not stats["pausal_unassigned"], stats["pausal_unassigned"])
    return {"passed": all(c["ok"] for c in checks), "checks": checks,
            "warnings": stats.get("warnings", [])}
