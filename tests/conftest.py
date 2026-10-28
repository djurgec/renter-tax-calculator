"""A small hand-made database with the same schema as the real one."""

import pytest
from fastapi.testclient import TestClient

from porezni_kompas.api.main import create_app
from porezni_kompas.etl.build import _connect
from porezni_kompas.etl.validate import LEGAL_RANGES

MUNICIPALITIES = [
    # code, name, county, category, ambiguous, lat, lon
    (981, "Dubrovnik", "Dubrovačko-neretvanska", "I", 0, 42.65, 18.09),
    (100, "Konavle", "Dubrovačko-neretvanska", "I", 0, 42.56, 18.30),
    (1333, "Zagreb", "Grad Zagreb", "II", 0, 45.81, 15.98),
    (3140, "Otok", "Splitsko-dalmatinska", "IV", 1, 43.69, 16.73),
    (5355, "Otok", "Vukovarsko-srijemska", "IV", 1, 45.15, 18.88),
]

RULES = [
    # id, code, level, settlement, street, house_from, house_to, parity, bed, camp, robinson,
    # category, source_row, ambiguous (Konavle's row is marked inferred for the tests)
    (1, 981, "municipality", "", "", None, None, None, 150.0, 150.0, 150.0, "I", 100, 0),
    (2, 981, "street", "Dubrovnik", "Placa", None, None, None, 250.0, 250.0, 250.0, "I", 472, 0),
    (3, 981, "house_range", "Dubrovnik", "Ulica dr. Ante Šercera", 1, 6, None,
     100.0, 100.0, 100.0, "I", 300, 0),
    (4, 1333, "municipality", "", "", None, None, None, 199.08, None, None, "II", 590, 0),
    (5, 3140, "municipality", "", "", None, None, None, 20.0, 20.0, 20.0, "IV", 1015, 1),
    (6, 3140, "municipality", "", "", None, None, None, 60.0, 60.0, 60.0, "IV", 1016, 1),
    (7, 5355, "municipality", "", "", None, None, None, 20.0, 20.0, 20.0, "IV", 1015, 1),
    (8, 5355, "municipality", "", "", None, None, None, 60.0, 60.0, 60.0, "IV", 1016, 1),
    (9, 100, "municipality", "", "", None, None, None, 120.0, 120.0, 120.0, "I", 700, 0),
]

PROPERTY = [  # code, year, min, max, is_range, raw, administered_by
    (981, 2025, 0.6, 5.0, 1, "0,60 do 5,00", "PU"), (981, 2026, 0.6, 5.0, 1, "0,60 do 5,00", "PU"),
    (1333, 2025, 5.0, 5.0, 0, "5", "PU"), (1333, 2026, 5.0, 5.0, 0, "5", "PU"),
    (3140, 2026, 1.0, 1.0, 0, "1", "JLS"), (100, 2026, 2.0, 2.0, 0, "2", "PU"),
]

STREETS = [
    # id, street, settlement, postcode, code, candidates, resolution, count
    (1, "Placa", "Dubrovnik", "20000", 981, None, "postcode_county", 2),
    (2, "Ulica dr. Ante Šercera", "Dubrovnik", "20000", 981, None, "postcode_county", 2),
    (3, "Ilica", "Zagreb", "10000", 1333, None, "postcode_county", 3),
    (4, "Put Milića", "Zagreb", "10000", 1333, None, "postcode_county", 5),
    (5, "Strossmayerova", "Otok", "21238", 3140, None, "postcode_county", 1),
    (6, "Ulica Mlini", "Mlini", "20207", None, "[981, 100]", "ambiguous", 1),
]

ADDRESSES = [  # id, street, number
    ("KB.1", 1, "1"), ("KB.2", 1, "2"), ("KB.3", 2, "4"), ("KB.4", 2, "40"),
    ("KB.5", 3, "1"), ("KB.6", 3, "1A"), ("KB.7", 3, "3"), ("KB.8", 4, "2"),
    ("KB.9", 5, "5"), ("KB.10", 6, "7"),
]

DATASETS = ["porezna_pausal", "porezna_property", "dgu_addresses", "posta", "voters"]


def build_fixture_db(path):
    from porezni_kompas.normalize import fold, parse_house_number

    con = _connect(path)
    con.executemany("INSERT INTO municipality VALUES (?,?,?,?,?,?,?,?,?)",
                    [(c, n, fold(n), cty, fold(cty), cat, amb, lat, lon)
                     for c, n, cty, cat, amb, lat, lon in MUNICIPALITIES])
    con.executemany(
        "INSERT INTO pausal_rule VALUES (?,2026,?,?,?,?,?,?,'exact',?,?,?,?,?,?,?,?,?,?)",
        [(i, c, lvl, s, fold(s), st, fold(st), hf, ht, par, b, cu, ru, cat, row, amb,
          int(c == 100))
         for i, c, lvl, s, st, hf, ht, par, b, cu, ru, cat, row, amb in RULES])
    con.executemany("INSERT INTO property_tax VALUES (?,?,?,?,?,?,?)", PROPERTY)
    con.executemany("INSERT INTO legal_range VALUES (?,?,?,?)",
                    [(k, *v) for k, v in LEGAL_RANGES.items()])
    names = {m[0]: m[1] for m in MUNICIPALITIES}
    con.executemany(
        "INSERT INTO street VALUES (?,?,?,?,?,NULL,?,?,?,?,?,?)",
        [(i, st, fold(st), s, fold(s), pc, code, cand, res,
          f"{st}, {s}, {pc} {names.get(code, '')}".strip(), n)
         for i, st, s, pc, code, cand, res, n in STREETS])
    con.execute("INSERT INTO street_fts(street_fts) VALUES ('rebuild')")
    con.executemany("INSERT INTO address(id, street_id, house_number, house_int, lat, lon) "
                    "VALUES (?,?,?,?,45.0,16.0)",
                    [(a, s, n, parse_house_number(n)[0]) for a, s, n in ADDRESSES])
    con.executemany("INSERT INTO dataset_meta VALUES (?,?,?,?,?,1,'x','','2026-10-28')",
                    [(k, f"https://example.test/{k}", "Publisher", k, "Otvorena dozvola")
                     for k in DATASETS])
    con.execute("INSERT INTO build_info VALUES ('tax_year', '2026')")
    con.commit()
    con.close()


@pytest.fixture(scope="session")
def client(tmp_path_factory):
    path = tmp_path_factory.mktemp("db") / "porezni_kompas.sqlite"
    build_fixture_db(path)
    return TestClient(create_app(path))
