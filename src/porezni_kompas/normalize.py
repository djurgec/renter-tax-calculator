"""Normalisation of names and numbers shared by the ETL, the rules engine and the API.

Keys built here are used for joining only; original spellings are kept for display.
"""

import re
import unicodedata

_PUNCT = re.compile(r"[.,;:/\\()'\"`´]")
_HYPHEN = re.compile(r"\s*[-–—]\s*")
_SPACES = re.compile(r"\s+")
_MUNICIPALITY_PREFIX = re.compile(r"^(GRAD|OPCINA)\s+")
_COUNTY_SUFFIX = re.compile(r"\s+ZUPANIJA$")
_PARENTHESIS = re.compile(r"\s*\(([^)]*)\)\s*$")


def fold(text: str | None) -> str:
    """Uppercase, strip diacritics and punctuation, unify hyphens and spaces."""
    if not text:
        return ""
    s = str(text).replace("Đ", "D").replace("đ", "d")
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii").upper()
    s = _HYPHEN.sub(" ", s)
    s = _PUNCT.sub(" ", s)
    return _SPACES.sub(" ", s).strip()


def split_hint(name: str | None) -> tuple[str, str]:
    """'Privlaka (ZD)' -> ('Privlaka', 'ZD'); 'Otok (Sinj)' -> ('Otok', 'Sinj')."""
    name = (name or "").strip()
    m = _PARENTHESIS.search(name)
    if not m:
        return name, ""
    return name[: m.start()].strip(), m.group(1).strip()


def municipality_key(name: str | None) -> str:
    base, _ = split_hint(name)
    key = _MUNICIPALITY_PREFIX.sub("", fold(base))
    # Porezna writes both "Sveta Nedjelja" and "Sveta Nedelja"
    return key.replace("NEDJELJA", "NEDELJA")


def county_key(name: str | None) -> str:
    return _COUNTY_SUFFIX.sub("", fold(name))


def place_key(name: str | None) -> str:
    """Settlement or street key."""
    return fold(name)


def parse_decimal(value) -> float | None:
    """Accepts floats, ints and strings with ',' or '.' decimals; blanks -> None."""
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int | float):
        return float(value)
    s = str(value).strip().replace(" ", "").replace(" ", "")
    if not s or s in {"-", "/"}:
        return None
    if "," in s and "." in s:  # 1.234,56 -> 1234.56
        s = s.replace(".", "")
    s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


_RANGE = re.compile(r"^\s*([\d.,]+)\s*(?:do|-|–)\s*([\d.,]+)\s*$", re.IGNORECASE)


def parse_rate(value) -> tuple[float | None, float | None, bool]:
    """'5,20 do 6,50' -> (5.2, 6.5, True); 1.6 -> (1.6, 1.6, False); '' -> (None, None, False)."""
    single = parse_decimal(value)
    if single is not None:
        return single, single, False
    m = _RANGE.match(str(value or ""))
    if m:
        lo, hi = parse_decimal(m.group(1)), parse_decimal(m.group(2))
        if lo is not None and hi is not None:
            return min(lo, hi), max(lo, hi), True
    return None, None, False


_HOUSE = re.compile(r"^\s*(\d+)\s*([A-Za-z]*)")


def parse_house_number(value: str | None) -> tuple[int | None, str]:
    """'12A' -> (12, 'A'); '' -> (None, '')."""
    m = _HOUSE.match(str(value or ""))
    if not m:
        return None, ""
    return int(m.group(1)), m.group(2).upper()
