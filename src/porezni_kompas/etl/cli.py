"""`porezni-kompas-etl`: download -> parse -> build -> validate -> publish."""

import argparse
import json
import logging
import os
import sys
from pathlib import Path

from .build import build
from .download import download, raw_path
from .municipalities import build_master, load_pausal_overrides
from .parse_dgu import iter_addresses
from .parse_dgu_units import build_register, iter_units
from .parse_porezna import parse_consumption, parse_income, parse_pausal, parse_property
from .parse_posta import parse_posta
from .parse_voters import parse_voters
from .resolve import Resolver
from .sources import SOURCES
from .validate import evaluate

log = logging.getLogger("porezni_kompas.etl")


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Build the PorezniKompas database.")
    p.add_argument("--data-dir", type=Path, default=Path("data"))
    p.add_argument("--refresh", action="store_true", help="re-download all sources")
    p.add_argument("--force", action="store_true", help="publish even if validation fails")
    args = p.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    raw = args.data_dir / "raw"
    out_dir = args.data_dir / "build"
    out_dir.mkdir(parents=True, exist_ok=True)

    meta = [download(s, raw, refresh=args.refresh) for s in SOURCES.values()]

    def path(key: str) -> Path:
        return raw_path(raw, SOURCES[key])

    log.info("parsing Porezna tables")
    pausal = parse_pausal(path("porezna_pausal"))
    prop = parse_property(path("porezna_property"))
    income = parse_income(path("porezna_income"))
    consumption = parse_consumption(path("porezna_consumption"))
    log.info("parsing voter register and postcodes")
    voters = parse_voters(path("voters"))
    posta = parse_posta(path("posta"))

    master, municipality_issues = build_master(prop, consumption, voters)
    overrides = load_pausal_overrides(
        args.data_dir / "reference" / "pausal_municipality_overrides.csv")
    log.info("parsing the register of spatial units (settlement -> municipality)")
    register = build_register(iter_units(path("dgu_admin_units")), master)
    log.info("register: %d settlements in %d municipalities", register.settlements,
             register.municipalities)
    resolver = Resolver(posta, voters, master, register)

    new_db = out_dir / "porezni_kompas.new.sqlite"
    if new_db.exists():
        new_db.unlink()
    stats = build(new_db, master=master, resolver=resolver, pausal=pausal, prop=prop,
                  income=income, consumption=consumption,
                  addresses=iter_addresses(path("dgu_addresses")), overrides=overrides,
                  meta=meta)

    s = stats.as_dict()
    s.update(municipalities=len(master.by_code), municipality_issues=municipality_issues,
             property_rows=len(prop), register_settlements=register.settlements,
             register_municipalities=register.municipalities,
             register_unmatched_municipalities=register.unmatched_municipalities,
             register_orphan_settlements=register.orphan_settlements[:50])
    s["warnings"] = [f"flat-rate table ambiguous for {b['name']} (block {b['block']}): "
                     f"codes {b['codes']}" for b in stats.pausal_ambiguous_blocks]
    report = evaluate(s)
    report["stats"] = s
    (out_dir / "validation_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=1, default=str), encoding="utf-8")

    for c in report["checks"]:
        log.info("%s %s: %s", "PASS" if c["ok"] else "FAIL", c["check"],
                 json.dumps(c["detail"], ensure_ascii=False, default=str)[:200])
    for w in report["warnings"]:
        log.warning(w)

    if report["passed"] or args.force:
        os.replace(new_db, out_dir / "porezni_kompas.sqlite")
        log.info("published %s", out_dir / "porezni_kompas.sqlite")
        return 0
    log.error("validation failed; the previous database (if any) stays live. See %s",
              out_dir / "validation_report.json")
    return 1


if __name__ == "__main__":
    sys.exit(main())
