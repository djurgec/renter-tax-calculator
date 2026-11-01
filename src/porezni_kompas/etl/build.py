"""Compile parsed sources into the SQLite database used by the API."""

import json
import logging
import sqlite3
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import UTC, datetime
from importlib.resources import files
from pathlib import Path

from pyproj import Transformer
from rapidfuzz import fuzz, process

from ..normalize import parse_house_number, place_key
from ..rules.pausal import PausalRule, select_rule
from .municipalities import MunicipalityIndex
from .parse_dgu import DguAddress
from .parse_porezna import ConsumptionRow, IncomeRow, PausalRow, PropertyRow
from .resolve import Resolver
from .validate import CROATIA_BBOX, LEGAL_RANGES

log = logging.getLogger(__name__)
YEAR = 2026
FUZZY_CUTOFF = 88


@dataclass
class BuildStats:
    addresses: int = 0
    addresses_resolved: int = 0
    resolution: dict = field(default_factory=lambda: defaultdict(int))
    pausal_levels: dict = field(default_factory=lambda: defaultdict(int))
    pausal_warnings: dict = field(default_factory=lambda: defaultdict(int))
    street_rules_total: int = 0
    street_rules_matched_exact: int = 0
    street_rules_matched_fuzzy: int = 0
    street_rules_unmatched: list = field(default_factory=list)
    pausal_unassigned: list = field(default_factory=list)
    pausal_ambiguous_blocks: list = field(default_factory=list)
    rates_outside_legal_range: list = field(default_factory=list)
    pausal_municipalities: int = 0
    coordinates_outside_croatia: int = 0
    # official register vs the name-based chain, per address (see resolve.py)
    register_check: dict = field(default_factory=lambda: defaultdict(int))
    register_disagreements: dict = field(default_factory=lambda: defaultdict(int))

    def as_dict(self) -> dict:
        d = self.__dict__.copy()
        d["resolution"] = dict(self.resolution)
        d["pausal_levels"] = dict(self.pausal_levels)
        d["pausal_warnings"] = dict(self.pausal_warnings)
        d["register_check"] = dict(self.register_check)
        d["register_disagreements"] = [
            {"settlement": s, "name_based": a, "register": b, "addresses": n}
            for (s, a, b), n in sorted(self.register_disagreements.items(),
                                       key=lambda kv: -kv[1])[:25]]
        return d


def _connect(path: Path) -> sqlite3.Connection:
    con = sqlite3.connect(path)
    con.execute("PRAGMA journal_mode = OFF")
    con.execute("PRAGMA synchronous = OFF")
    schema = files("porezni_kompas.etl").joinpath("schema.sql").read_text(encoding="utf-8")
    if sqlite3.sqlite_version_info < (3, 45, 0):  # remove_diacritics for trigram needs 3.45
        schema = schema.replace("tokenize='trigram remove_diacritics 1'", "tokenize='trigram'")
    con.executescript(schema)
    return con


def _assign_pausal_blocks(pausal: list[PausalRow], master: MunicipalityIndex,
                          overrides: dict, stats: BuildStats) -> dict[tuple[str, int], list[int]]:
    """(raw municipality name, block) -> municipality codes the rows belong to."""
    out = {}
    for name, block in dict.fromkeys((r.raw_municipality, r.block) for r in pausal):
        if (name, block) in overrides:
            out[(name, block)] = [overrides[(name, block)][0]]
            continue
        codes = master.lookup(name)
        if not codes:
            stats.pausal_unassigned.append(name)
        elif len(codes) > 1:
            stats.pausal_ambiguous_blocks.append({"name": name, "block": block, "codes": codes})
        out[(name, block)] = codes
    return out


def build(db_path: Path, *, master: MunicipalityIndex, resolver: Resolver,
          pausal: list[PausalRow], prop: list[PropertyRow], income: list[IncomeRow],
          consumption: list[ConsumptionRow], addresses, overrides: dict,
          meta: list[dict]) -> BuildStats:
    stats = BuildStats()
    con = _connect(db_path)
    t0 = time.time()

    # ---- municipalities and simple tax tables
    con.executemany("INSERT INTO municipality(code, name, name_key, county, county_key) "
                    "VALUES (?,?,?,?,?)",
                    [(m.code, m.name, m.key, m.county, m.county_key)
                     for m in master.by_code.values()])
    for r in prop:
        con.executemany(
            "INSERT INTO property_tax VALUES (?,?,?,?,?,?,?)",
            [(r.code, 2025, r.rate_min_2025, r.rate_max_2025, r.is_range_2025, r.raw_2025,
              r.admin_2025),
             (r.code, 2026, r.rate_min_2026, r.rate_max_2026, r.is_range_2026, r.raw_2026,
              r.admin_2026)])
    for r in consumption:
        con.executemany("INSERT INTO consumption_tax VALUES (?,?,?)",
                        [(r.code, 2025, r.rate_2025), (r.code, 2026, r.rate_2026)])
    by_rbr = {r.rbr: r.code for r in consumption}
    for r in income:  # same row numbering (Rbr.) as the consumption table
        code = by_rbr.get(r.rbr)
        if code is not None:
            con.executemany("INSERT INTO income_tax VALUES (?,?,?,?)",
                            [(code, 2025, r.lower_2025, r.higher_2025),
                             (code, 2026, r.lower_2026, r.higher_2026)])
    con.executemany("INSERT INTO legal_range VALUES (?,?,?,?)",
                    [(k, *v) for k, v in LEGAL_RANGES.items()])

    # ---- pass 1: addresses -> streets, municipality per street
    to_wgs84 = Transformer.from_crs(3035, 4326, always_xy=True)
    streets: dict[tuple[str, str, str, str], int] = {}
    street_rows: dict[int, list] = {}
    street_res = {}
    batch: list[DguAddress] = []
    # (municipality code, settlement key) -> {street key}
    known_streets: dict[tuple[int, str], set] = defaultdict(set)

    def flush(batch: list[DguAddress]):
        xs = [a.x3035 or 0.0 for a in batch]
        ys = [a.y3035 or 0.0 for a in batch]
        lons, lats = to_wgs84.transform(xs, ys)
        rows = []
        for a, lon, lat in zip(batch, lons, lats, strict=True):
            sid = streets[(a.settlement, a.settlement_code, a.postcode, a.street)]
            num, _ = parse_house_number(a.number)
            ok = a.x3035 is not None
            lat_min, lon_min, lat_max, lon_max = CROATIA_BBOX
            if ok and not (lat_min <= lat <= lat_max and lon_min <= lon <= lon_max):
                stats.coordinates_outside_croatia += 1
            rows.append((a.id, sid, a.number, num, round(lat, 6) if ok else None,
                         round(lon, 6) if ok else None))
        con.executemany("INSERT INTO address(id, street_id, house_number, house_int, lat, lon) "
                        "VALUES (?,?,?,?,?,?)", rows)

    for a in addresses:
        stats.addresses += 1
        # the settlement code keeps same-named settlements with one postcode apart
        gk = (a.settlement, a.settlement_code, a.postcode, a.street)
        if gk not in streets:
            sid = len(streets) + 1
            streets[gk] = sid
            s_key = place_key(a.settlement)
            res = resolver.resolve(s_key, a.postcode, a.settlement_code)
            street_res[sid] = res
            street_rows[sid] = [sid, a.street, place_key(a.street), a.settlement, s_key,
                                a.settlement_code, a.postcode, res.code,
                                json.dumps(res.candidates) if res.code is None else None,
                                res.method, 0]
            if res.code is not None:
                known_streets[(res.code, s_key)].add(place_key(a.street))
        sid = streets[gk]
        street_rows[sid][-1] += 1
        res = street_res[sid]
        stats.resolution[res.method] += 1
        if res.code is not None:
            stats.addresses_resolved += 1
        if res.cross_check:
            stats.register_check[res.cross_check] += 1
            if res.cross_check == "different":
                stats.register_disagreements[(a.settlement, res.fallback_code, res.code)] += 1
        batch.append(a)
        if len(batch) >= 50_000:
            flush(batch)
            batch = []
        if stats.addresses % 250_000 == 0:
            log.info("addresses: %d (%ds)", stats.addresses, time.time() - t0)
    if batch:
        flush(batch)

    names = {m.code: m.name for m in master.by_code.values()}
    con.executemany(
        "INSERT INTO street(id, street, street_key, settlement, settlement_key, settlement_code,"
        " postcode, municipality_code, candidate_codes, resolution, address_count, label)"
        " VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        [(*r, f"{r[1]}, {r[3]}, {r[6]} {names.get(r[7], '')}".strip())
         for r in street_rows.values()])
    con.execute("INSERT INTO street_fts(street_fts) VALUES ('rebuild')")
    log.info("streets: %d", len(street_rows))

    # ---- flat-rate rules, assigned to municipalities and matched to known streets
    blocks = _assign_pausal_blocks(pausal, master, overrides, stats)
    rules_by_code: dict[int, list[PausalRule]] = defaultdict(list)
    category_by_code: dict[int, str] = {}
    rule_rows = []
    rid = 0
    for r in pausal:
        codes = blocks.get((r.raw_municipality, r.block), [])
        ambiguous = len(codes) > 1
        inferred = overrides.get((r.raw_municipality, r.block), (None, False))[1]
        lo, hi, _ = LEGAL_RANGES.get(r.category, (None, None, None))
        for rate in (r.rate_bed,):
            if rate and lo is not None and not lo <= rate <= hi:
                stats.rates_outside_legal_range.append(
                    {"row": r.source_row, "municipality": r.raw_municipality,
                     "category": r.category, "rate": rate})
        s_key, st_key = place_key(r.settlement), place_key(r.street)
        if r.level in ("street", "house_range"):
            stats.street_rules_total += 1
        for code in codes:
            category_by_code.setdefault(code, r.category)
            match = None
            if r.level in ("street", "house_range"):
                pool = known_streets.get((code, s_key)) or set().union(
                    *(v for (c, _), v in known_streets.items() if c == code))
                if st_key in pool:
                    match = "exact"
                else:
                    best = process.extractOne(st_key, pool, scorer=fuzz.ratio,
                                              score_cutoff=FUZZY_CUTOFF) if pool else None
                    if best:
                        st_key, match = best[0], "fuzzy"
                    else:
                        match = "unmatched"
                if code == codes[0]:
                    if match == "exact":
                        stats.street_rules_matched_exact += 1
                    elif match == "fuzzy":
                        stats.street_rules_matched_fuzzy += 1
                    else:
                        stats.street_rules_unmatched.append(
                            {"row": r.source_row, "municipality": r.raw_municipality,
                             "settlement": r.settlement, "street": r.street})
            rid += 1
            rule = PausalRule(id=rid, municipality_code=code, settlement_key=s_key,
                              street_key=st_key, level=r.level, house_from=r.house_from,
                              house_to=r.house_to, parity=r.parity, rate_bed=r.rate_bed,
                              rate_camp_unit=r.rate_camp_unit, rate_robinson=r.rate_robinson,
                              source_ambiguous=ambiguous)
            rules_by_code[code].append(rule)
            rule_rows.append((rid, YEAR, code, r.level, r.settlement, s_key, r.street, st_key,
                              match, r.house_from, r.house_to, r.parity, r.rate_bed,
                              r.rate_camp_unit, r.rate_robinson, r.category, r.source_row,
                              int(ambiguous), int(inferred)))
    con.executemany("INSERT INTO pausal_rule VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    rule_rows)
    con.executemany("UPDATE municipality SET tourism_category = ? WHERE code = ?",
                    [(cat, code) for code, cat in category_by_code.items()])
    ambiguous_codes = {c for b in stats.pausal_ambiguous_blocks for c in b["codes"]}
    con.executemany("UPDATE municipality SET pausal_source_ambiguous = 1 WHERE code = ?",
                    [(c,) for c in ambiguous_codes])
    stats.pausal_municipalities = len(rules_by_code)

    # ---- pass 2: applicable flat-rate rule for every resolved address
    cache = {}
    updates = []
    cur = con.execute("SELECT a.id, a.street_id, a.house_int, s.municipality_code, "
                      "s.settlement_key, s.street_key FROM address a "
                      "JOIN street s ON s.id = a.street_id WHERE s.municipality_code IS NOT NULL")
    for aid, sid, num, code, s_key, st_key in cur:
        rules = rules_by_code.get(code, [])
        number_matters = any(r.street_key == st_key and (r.parity or r.level == "house_range")
                             for r in rules)
        ck = (sid, num if number_matters else None)
        if ck not in cache:
            cache[ck] = select_rule(rules, s_key, st_key, num)
        m = cache[ck]
        stats.pausal_levels[m.level or "none"] += 1
        for w in m.warnings:
            stats.pausal_warnings[w] += 1
        updates.append((m.rule.id if m.rule else None, m.level,
                        json.dumps(m.warnings) if m.warnings else None, aid))
    con.executemany("UPDATE address SET pausal_rule_id = ?, pausal_level = ?, "
                    "pausal_warnings = ? WHERE id = ?", updates)

    con.executemany("UPDATE municipality SET lat = ?, lon = ? WHERE code = ?", con.execute(
        "SELECT round(avg(a.lat), 5), round(avg(a.lon), 5), s.municipality_code FROM address a "
        "JOIN street s ON s.id = a.street_id "
        "WHERE s.municipality_code IS NOT NULL AND a.lat IS NOT NULL "
        "GROUP BY s.municipality_code").fetchall())

    # ---- provenance
    con.executemany("INSERT INTO dataset_meta VALUES (?,?,?,?,?,?,?,?,?)",
                    [(m["key"], m["url"], m["publisher"], m["dataset"], m["licence"],
                      m["bytes"], m["sha256"], m.get("last_modified", ""), m["downloaded_at"])
                     for m in meta])
    con.executemany("INSERT INTO build_info VALUES (?,?)", [
        ("built_at", datetime.now(UTC).isoformat(timespec="seconds")),
        ("tax_year", str(YEAR)),
        ("sqlite_version", sqlite3.sqlite_version),
    ])
    con.commit()
    con.execute("ANALYZE")
    con.close()
    log.info("build finished in %ds", time.time() - t0)
    return stats
