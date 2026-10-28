import pytest

from porezni_kompas.normalize import (
    county_key,
    municipality_key,
    parse_decimal,
    parse_house_number,
    parse_rate,
    place_key,
    split_hint,
)


@pytest.mark.parametrize(
    ("a", "b"),
    [
        ("BALE - VALLE", "Bale-Valle"),
        ("TAR-VABRIGA - TORRE-ABREGA", "Tar-Vabriga-Torre Abrega"),
        ("Sveta Nedjelja (PU)", "SVETA NEDELJA"),
        ("GRAD ZAGREB", "Zagreb"),
        ("Općina Đurđenovac", "ĐURĐENOVAC"),
    ],
)
def test_municipality_spellings_join(a, b):
    assert municipality_key(a) == municipality_key(b)


def test_split_hint():
    assert split_hint("Privlaka (ZD)") == ("Privlaka", "ZD")
    assert split_hint("OTOK (SINJ)") == ("OTOK", "SINJ")
    assert split_hint("Dubrovnik") == ("Dubrovnik", "")


def test_county_key_drops_suffix():
    assert county_key("ZAGREBAČKA ŽUPANIJA") == county_key("Zagrebačka") == "ZAGREBACKA"
    assert county_key("Grad Zagreb") == "GRAD ZAGREB"


def test_place_key():
    assert place_key("Dr. Ante Šercera") == "DR ANTE SERCERA"


@pytest.mark.parametrize(
    ("value", "expected"),
    [("1,5", 1.5), ("1.50", 1.5), (2, 2.0), ("", None), (None, None), ("1.234,56", 1234.56)],
)
def test_parse_decimal(value, expected):
    assert parse_decimal(value) == expected


def test_parse_rate_range_and_single():
    assert parse_rate("5,20 do 6,50") == (5.2, 6.5, True)
    assert parse_rate(1.6) == (1.6, 1.6, False)
    assert parse_rate("") == (None, None, False)


def test_parse_house_number():
    assert parse_house_number("12A") == (12, "A")
    assert parse_house_number("7") == (7, "")
    assert parse_house_number("bb") == (None, "")
