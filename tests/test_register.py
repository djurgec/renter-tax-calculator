"""DGU register of spatial units: settlement code -> municipality, and the resolver order."""

import zipfile

import pytest

from porezni_kompas.etl.municipalities import Municipality, MunicipalityIndex
from porezni_kompas.etl.parse_dgu_units import build_register, iter_units
from porezni_kompas.etl.parse_voters import VoterIndex
from porezni_kompas.etl.resolve import Resolver

LEVEL = "http://inspire.ec.europa.eu/codelist/AdministrativeHierarchyLevel/"

# id, level, code, name, upper
UNITS = [
    ("C1", "2ndOrder", "17", "Splitsko-dalmatinska županija", ""),
    ("C2", "2ndOrder", "16", "Vukovarsko-srijemska županija", ""),
    ("M1", "3rdOrder", "03140", "Otok", "C1"),
    ("M2", "3rdOrder", "05355", "Otok", "C2"),
    ("M3", "3rdOrder", "04000", "Sinj", "C1"),
    ("S1", "4thOrder", "000001", "Otok", "M1"),
    ("S2", "4thOrder", "000002", "Ruda", "M1"),
    ("S3", "4thOrder", "000003", "Otok", "M2"),
    ("S4", "4thOrder", "000004", "Sinj", "M3"),
    ("D1", "5thOrder", "0000011", "SK 0000011", "S1"),  # statistical district: skipped
]

MASTER = MunicipalityIndex([
    Municipality(3140, "Otok", "OTOK", "SPLITSKO DALMATINSKA", "Splitsko-Dalmatinska"),
    Municipality(5355, "Otok", "OTOK", "VUKOVARSKO SRIJEMSKA", "Vukovarsko-Srijemska"),
    Municipality(4000, "Sinj", "SINJ", "SPLITSKO DALMATINSKA", "Splitsko-Dalmatinska"),
])


def member(uid, level, code, name, upper):
    up = f'<au:upperLevelUnit xlink:href="#AdministrativeUnit.{upper}"/>' if upper else ""
    return (f'<wfs:member><au:AdministrativeUnit gml:id="AdministrativeUnit.{uid}">'
            f'<au:geometry><gml:MultiSurface gml:id="geom.{uid}"><gml:posList>4600000 2400000 '
            f'4600010 2400010</gml:posList></gml:MultiSurface></au:geometry>'
            f'<au:nationalCode>{code}</au:nationalCode>'
            f'<au:nationalLevel xlink:href="{LEVEL}{level}"/>'
            f'<au:name><gn:GeographicalName><gn:spelling><gn:SpellingOfName>'
            f'<gn:text>{name}</gn:text></gn:SpellingOfName></gn:spelling></gn:GeographicalName>'
            f'</au:name>{up}</au:AdministrativeUnit></wfs:member>')


@pytest.fixture
def units_zip(tmp_path):
    body = "".join(member(*u) for u in UNITS)
    path = tmp_path / "au.zip"
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("AdministrativeUnit.gml",
                    f'<?xml version="1.0"?><wfs:FeatureCollection>{body}</wfs:FeatureCollection>')
    return path


def test_parser_keeps_counties_municipalities_and_settlements(units_zip):
    units = list(iter_units(units_zip))
    assert [u.id for u in units] == [f"AdministrativeUnit.{u[0]}" for u in UNITS[:-1]]
    otok = units[2]
    assert (otok.level, otok.code, otok.name, otok.upper) == (
        "3rdOrder", "03140", "Otok", "AdministrativeUnit.C1")


def test_same_named_municipalities_are_told_apart_by_county(units_zip):
    reg = build_register(iter_units(units_zip), MASTER)
    assert (reg.municipalities, reg.settlements) == (3, 4)
    assert reg.unmatched_municipalities == [] and reg.orphan_settlements == []
    assert reg.lookup("000001") == 3140  # Otok near Sinj
    assert reg.lookup("000003") == 5355  # Otok near Vinkovci
    assert reg.lookup("000002") == 3140
    assert reg.lookup("999999") is None


def test_unknown_municipality_is_reported(units_zip):
    without_sinj = MunicipalityIndex([MASTER.by_code[3140], MASTER.by_code[5355]])
    reg = build_register(iter_units(units_zip), without_sinj)
    assert "Sinj (Splitsko-dalmatinska županija)" in reg.unmatched_municipalities
    assert "Sinj (000004)" in reg.orphan_settlements


def resolver(units_zip, voters_rows):
    voters = VoterIndex()
    for county, municipality, settlement in voters_rows:
        voters.county_settlement[(county, settlement)].add(municipality)
        voters.settlement[settlement].add((county, municipality))
    posta = {("OTOK", "21238"): "SPLITSKO DALMATINSKA"}
    return Resolver(posta, voters, MASTER, build_register(iter_units(units_zip), MASTER))


def test_register_wins_and_is_cross_checked(units_zip):
    r = resolver(units_zip, [("SPLITSKO DALMATINSKA", "OTOK", "OTOK")])
    res = r.resolve("OTOK", "21238", "000001")
    assert (res.code, res.method, res.cross_check) == (3140, "register", "same")


def test_register_corrects_a_wrong_name_match(units_zip):
    # the name chain says Sinj; the register says Otok
    r = resolver(units_zip, [("SPLITSKO DALMATINSKA", "SINJ", "RUDA")])
    res = r.resolve("RUDA", "21238", "000002")
    assert (res.code, res.cross_check, res.fallback_code) == (3140, "different", 4000)


def test_register_resolves_what_names_cannot(units_zip):
    # "Otok" exists in two counties and has no postcode entry: ambiguous by name
    r = resolver(units_zip, [("SPLITSKO DALMATINSKA", "OTOK", "OTOK"),
                             ("VUKOVARSKO SRIJEMSKA", "OTOK", "OTOK")])
    assert r.resolve("OTOK", "32252", "").method == "ambiguous"
    res = r.resolve("OTOK", "32252", "000003")
    assert (res.code, res.method, res.cross_check) == (5355, "register", "fallback_unresolved")


def test_without_register_the_name_chain_is_used(units_zip):
    r = Resolver({("OTOK", "21238"): "SPLITSKO DALMATINSKA"}, VoterIndex(), MASTER)
    assert r.resolve("OTOK", "21238", "000001").method == "unknown"
