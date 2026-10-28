"""Stream the DGU INSPIRE address register (GML inside a ZIP).

Address.gml is ~2.6 GB uncompressed, so it is read in chunks straight from the
ZIP and split on </wfs:member>; nothing is unpacked to disk. Regular
expressions are used instead of an XML parser because the structure is flat
and regexes are several times faster here.
"""

import io
import re
import zipfile
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path

_MEMBER = re.compile(r"<wfs:member>(.*?)</wfs:member>", re.S)
_ID = re.compile(r'gml:id="([^"]+)"')
_TEXT = re.compile(r"<gn:text>(.*?)</gn:text>", re.S)
_ALT = re.compile(r"<ad:alternativeIdentifier>(.*?)</ad:alternativeIdentifier>")
_LEVEL = re.compile(r'AdministrativeHierarchyLevel/(\w+)"')
_POSTCODE = re.compile(r"<ad:postCode>(.*?)</ad:postCode>")
_LOCAL_ID = re.compile(r"<base:localId>([^<]+)</base:localId>")
_COMPONENT = re.compile(r'<ad:component xlink:href="#([^"]+)"')
_DESIGNATOR = re.compile(
    r"<ad:designator>([^<]*)</ad:designator><ad:type[^>]*LocatorDesignatorTypeValue/(\w+)"
)
_POS = re.compile(r"<gml:pos>([^<]+)</gml:pos>")
_NUMBER_PARTS = {"addressNumber", "addressNumberExtension", "addressNumber2ndExtension"}


@dataclass
class DguAddress:
    id: str
    settlement: str
    settlement_code: str
    street: str
    number: str
    postcode: str
    x3035: float | None
    y3035: float | None


def _members(zf: zipfile.ZipFile, name: str, chunk: int = 8 << 20) -> Iterator[str]:
    buf = ""
    with zf.open(name) as fh:
        reader = io.TextIOWrapper(fh, encoding="utf-8")
        while data := reader.read(chunk):
            buf += data
            last = buf.rfind("</wfs:member>")
            if last == -1:
                continue
            cut = last + len("</wfs:member>")
            for m in _MEMBER.finditer(buf, 0, cut):
                yield m.group(1)
            buf = buf[cut:]


def _first(rx: re.Pattern, s: str) -> str:
    m = rx.search(s)
    return m.group(1).strip() if m else ""


def iter_addresses(zip_path: Path) -> Iterator[DguAddress]:
    with zipfile.ZipFile(zip_path) as zf:
        settlements = {}
        for m in _members(zf, "AdminUnitName.gml"):
            if _first(_LEVEL, m) == "4thOrder":  # settlements (naselja)
                settlements[_first(_ID, m)] = (_first(_TEXT, m), _first(_ALT, m))
        streets = {_first(_ID, m): _first(_TEXT, m) for m in _members(zf, "ThoroughfareName.gml")}
        posts = {_first(_ID, m): _first(_POSTCODE, m) for m in _members(zf, "PostalDescriptor.gml")}

        for m in _members(zf, "Address.gml"):
            comps = _COMPONENT.findall(m)
            settlement, settlement_code, street, postcode = "", "", "", ""
            for c in comps:
                if c in streets:
                    street = streets[c]
                elif c in posts:
                    postcode = posts[c]
                elif c in settlements:
                    settlement, settlement_code = settlements[c]
            number = "".join(d for d, t in _DESIGNATOR.findall(m) if t in _NUMBER_PARTS)
            pos = _first(_POS, m).split()
            yield DguAddress(
                id=_first(_LOCAL_ID, m),
                settlement=settlement,
                settlement_code=settlement_code,
                street=street,
                number=number,
                postcode=postcode,
                # EPSG:3035 axis order is northing, easting: gml:pos is "y x"
                x3035=float(pos[1]) if len(pos) == 2 else None,
                y3035=float(pos[0]) if len(pos) == 2 else None,
            )
