"""Hrvatska pošta: settlement + postcode -> county."""

from pathlib import Path

from ..normalize import county_key, place_key
from .xlsx import cell_text, find_col, find_header_row, read_rows


def parse_posta(path: Path) -> dict[tuple[str, str], str]:
    rows = read_rows(path)
    h = find_header_row(rows, "brojpu", "naselje", "zupanija")
    hdr = rows[h]
    c_pc = find_col(hdr, "brojpu")
    c_set = find_col(hdr, "naselje")
    c_cty = find_col(hdr, "zupanija")
    out = {}
    for r in rows[h + 1 :]:
        pc = cell_text(r[c_pc])
        if pc:
            out[(place_key(cell_text(r[c_set])), pc)] = county_key(cell_text(r[c_cty]))
    return out
