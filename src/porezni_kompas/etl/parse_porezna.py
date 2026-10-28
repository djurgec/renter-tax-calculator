"""Parse the four Porezna uprava tables published on data.gov.hr.

Columns are located by header text; if Porezna changes a layout the parser
raises instead of silently reading the wrong column.
"""

from dataclasses import dataclass
from pathlib import Path

from ..normalize import parse_decimal, parse_rate, place_key
from .xlsx import cell_text, find_col, find_header_row, read_rows


@dataclass
class PausalRow:
    source_row: int  # 1-based row number in the official XLSX
    raw_municipality: str
    block: int  # ordinal of this municipality name (duplicates get 1, 2, ...)
    settlement: str
    street: str
    level: str  # municipality | settlement | street | house_range
    house_from: int | None
    house_to: int | None
    parity: str | None  # even | odd | None
    rate_bed: float | None
    rate_camp_unit: float | None
    rate_robinson: float | None
    category: str


@dataclass
class PropertyRow:
    code: int
    raw_name: str
    rate_min_2025: float | None
    rate_max_2025: float | None
    is_range_2025: bool
    raw_2025: str
    admin_2025: str
    rate_min_2026: float | None
    rate_max_2026: float | None
    is_range_2026: bool
    raw_2026: str
    admin_2026: str


@dataclass
class ConsumptionRow:
    rbr: int
    code: int
    raw_name: str
    rate_2025: float | None
    rate_2026: float | None


@dataclass
class IncomeRow:
    rbr: int
    raw_name: str
    lower_2026: float | None
    higher_2026: float | None
    lower_2025: float | None
    higher_2025: float | None


def _rbr(value) -> int | None:
    v = parse_decimal(cell_text(value).rstrip("."))
    return int(v) if v is not None else None


def parse_pausal(path: Path) -> list[PausalRow]:
    rows = read_rows(path)
    h = find_header_row(rows, "naziv op", "naziv nas", "naziv ul")
    top, sub = rows[h], rows[h + 1]
    # Two header rows: the second one names the rate columns
    c_mun = find_col(top, "naziv op")
    c_set = find_col(top, "naziv nas")
    c_str = find_col(top, "naziv ul")
    c_bed = find_col(sub, "krevet")
    c_unit = find_col(sub, "smj", start=c_bed + 1)
    c_rob = find_col(sub, "rob", start=c_unit + 1)
    c_from = find_col(sub, "od", start=c_rob + 1)
    c_to = find_col(sub, "do", start=c_from + 1)
    c_rng_bed = find_col(sub, "po krevetu", start=c_to + 1)
    c_rng_unit = find_col(sub, "po smj", start=c_rng_bed + 1)
    c_even_bed = find_col(sub, "parni/krevetu")
    c_odd_bed = find_col(sub, "neparni/krevetu")
    c_even_unit = find_col(sub, "parni/smj")
    c_odd_unit = find_col(sub, "neparni/ smj")
    c_cat = find_col(top, "kategorija")

    out: list[PausalRow] = []
    blocks: dict[str, int] = {}
    prev_name = None
    block_has_municipality_row = False
    for i, r in enumerate(rows[h + 2 :], start=h + 3):
        r = list(r) + [None] * (c_cat + 1 - len(r))
        name = cell_text(r[c_mun])
        if not name:
            continue
        settlement, street = cell_text(r[c_set]), cell_text(r[c_str])
        is_municipality_row = not settlement and not street
        # A new block starts when the name changes, or when a second municipality
        # with the same name starts (a second municipality-level row in a row).
        if name != prev_name or (is_municipality_row and block_has_municipality_row):
            blocks[name] = blocks.get(name, 0) + 1
            block_has_municipality_row = False
        block_has_municipality_row = block_has_municipality_row or is_municipality_row
        prev_name = name
        block = blocks[name]
        category = cell_text(r[c_cat]) or "?"
        base = dict(source_row=i, raw_municipality=name, block=block,
                    settlement=settlement, street=street, category=category)

        h_from = parse_decimal(r[c_from])
        h_to = parse_decimal(r[c_to])
        if (h_from or 0) > 0 or (h_to or 0) > 0:
            out.append(PausalRow(**base, level="house_range",
                                 house_from=int(h_from or 0), house_to=int(h_to or 10**6),
                                 parity=None, rate_bed=parse_decimal(r[c_rng_bed]),
                                 rate_camp_unit=parse_decimal(r[c_rng_unit]), rate_robinson=None))
            continue
        parity_vals = [parse_decimal(r[c]) or 0 for c in
                       (c_even_bed, c_odd_bed, c_even_unit, c_odd_unit)]
        level = "street" if street else "settlement" if settlement else "municipality"
        if any(parity_vals):
            for parity, bed, unit in (("even", parity_vals[0], parity_vals[2]),
                                      ("odd", parity_vals[1], parity_vals[3])):
                out.append(PausalRow(**base, level=level, house_from=None, house_to=None,
                                     parity=parity, rate_bed=bed or None,
                                     rate_camp_unit=unit or None, rate_robinson=None))
            continue
        out.append(PausalRow(**base, level=level, house_from=None, house_to=None, parity=None,
                             rate_bed=parse_decimal(r[c_bed]),
                             rate_camp_unit=parse_decimal(r[c_unit]),
                             rate_robinson=parse_decimal(r[c_rob])))
    return out


def parse_property(path: Path) -> list[PropertyRow]:
    rows = read_rows(path)
    h = find_header_row(rows, "šifra")
    hdr = rows[h]
    c_name = find_col(hdr, "grad")
    c_code = find_col(hdr, "šifra")
    c_25 = find_col(hdr, "iznos", "2025")
    c_26 = find_col(hdr, "iznos", "2026")
    c_adm25 = find_col(hdr, "nadležnost", start=c_25 + 1)
    c_adm26 = find_col(hdr, "nadležnost", start=c_26 + 1)
    out = []
    for r in rows[h + 1 :]:
        code = parse_decimal(r[c_code]) if len(r) > c_code else None
        if code is None:
            continue
        lo25, hi25, rng25 = parse_rate(r[c_25])
        lo26, hi26, rng26 = parse_rate(r[c_26])
        out.append(PropertyRow(
            code=int(code), raw_name=cell_text(r[c_name]),
            rate_min_2025=lo25, rate_max_2025=hi25, is_range_2025=rng25,
            raw_2025=cell_text(r[c_25]), admin_2025=cell_text(r[c_adm25]),
            rate_min_2026=lo26, rate_max_2026=hi26, is_range_2026=rng26,
            raw_2026=cell_text(r[c_26]), admin_2026=cell_text(r[c_adm26]),
        ))
    return out


def parse_consumption(path: Path) -> list[ConsumptionRow]:
    rows = read_rows(path)
    h = find_header_row(rows, "šifra", "ime grada")
    hdr = rows[h]
    c_rbr, c_code = find_col(hdr, "rbr"), find_col(hdr, "šifra")
    c_name = find_col(hdr, "ime grada")
    c_25, c_26 = find_col(hdr, "2025"), find_col(hdr, "2026")
    out = []
    for r in rows[h + 1 :]:
        rbr, code = _rbr(r[c_rbr]), parse_decimal(r[c_code])
        if rbr is None or code is None:
            continue
        out.append(ConsumptionRow(rbr=rbr, code=int(code), raw_name=cell_text(r[c_name]),
                                  rate_2025=parse_decimal(r[c_25]),
                                  rate_2026=parse_decimal(r[c_26])))
    return out


def parse_income(path: Path) -> list[IncomeRow]:
    rows = read_rows(path)
    h = find_header_row(rows, "ime grada", "niža")
    hdr = rows[h]
    c_rbr, c_name = find_col(hdr, "rbr"), find_col(hdr, "ime grada")
    c_lo26, c_hi26 = find_col(hdr, "niža", "2026"), find_col(hdr, "viša", "2026")
    c_lo25, c_hi25 = find_col(hdr, "niža", "2025"), find_col(hdr, "viša", "2025")
    out = []
    for r in rows[h + 1 :]:
        rbr = _rbr(r[c_rbr])
        if rbr is None or not cell_text(r[c_name]):
            continue
        out.append(IncomeRow(rbr=rbr, raw_name=cell_text(r[c_name]),
                             lower_2026=parse_decimal(r[c_lo26]),
                             higher_2026=parse_decimal(r[c_hi26]),
                             lower_2025=parse_decimal(r[c_lo25]),
                             higher_2025=parse_decimal(r[c_hi25])))
    return out


def settlement_and_street_keys(row: PausalRow) -> tuple[str, str]:
    return place_key(row.settlement), place_key(row.street)
