import pytest

from porezni_kompas.api.search import parse_query


def calc(client, **body):
    return client.post("/api/calculate", json=body)


# ---- query parsing


@pytest.mark.parametrize(("q", "tokens", "number", "postcode"), [
    ("Ilica 1 Zagreb", ["ILICA", "ZAGREB"], "1", None),
    ("šercera 4a dubrovnik", ["SERCERA", "DUBROVNIK"], "4A", None),
    ("Ulica 204. vukovarske brigade 12", ["ULICA", "204", "VUKOVARSKE", "BRIGADE"], "12", None),
    ("ilica 10000", ["ILICA"], None, "10000"),
])
def test_parse_query(q, tokens, number, postcode):
    pq = parse_query(q)
    assert (pq.tokens, pq.house_number, pq.postcode) == (tokens, number, postcode)


# ---- search


def test_search_finds_the_house(client):
    hits = client.get("/api/addresses/search", params={"q": "ilica 1 zagreb"}).json()
    assert hits[0]["kind"] == "address"
    assert hits[0]["address_id"] == "KB.5"
    assert hits[0]["label"] == "Ilica 1, Zagreb, 10000 Zagreb"


def test_whole_word_beats_substring(client):
    # "ilica" is also inside "Put MILICA", which has more addresses
    hits = client.get("/api/addresses/search", params={"q": "ilica"}).json()
    assert [h["street_id"] for h in hits][:2] == [3, 4]
    assert hits[0]["kind"] == "street"


def test_search_ignores_diacritics_and_matches_suffix(client):
    for q in ("šercera 4", "sercera 4"):
        hit = client.get("/api/addresses/search", params={"q": q}).json()[0]
        assert hit["address_id"] == "KB.3"
    assert client.get("/api/addresses/search",
                      params={"q": "ilica 1a"}).json()[0]["address_id"] == "KB.6"


def test_unknown_house_number_returns_the_street(client):
    hit = client.get("/api/addresses/search", params={"q": "ilica 99"}).json()[0]
    assert hit["kind"] == "street" and hit["street_id"] == 3


def test_too_short_query_returns_nothing(client):
    assert client.get("/api/addresses/search", params={"q": "du"}).json() == []


def test_ambiguous_street_is_flagged(client):
    hit = client.get("/api/addresses/search", params={"q": "mlini"}).json()[0]
    assert hit["municipality"] is None and hit["needs_municipality"]


def test_house_numbers_of_a_street(client):
    numbers = client.get("/api/streets/3/addresses").json()
    assert [n["house_number"] for n in numbers] == ["1", "1A", "3"]
    assert client.get("/api/streets/999/addresses").status_code == 404


# ---- addresses


def test_address_detail(client):
    a = client.get("/api/addresses/KB.1").json()
    assert a["municipality"]["code"] == 981
    assert "_street_key" not in a
    assert client.get("/api/addresses/nope").status_code == 404


# ---- calculation


def test_street_rule_with_provenance(client):
    r = calc(client, address_id="KB.1", beds=4).json()
    assert r["pausal"]["level"] == "street"
    assert r["pausal"]["amount"] == 1000.0
    assert r["pausal"]["rule"]["source_row"] == 472
    assert r["pausal"]["legal_range"]["category"] == "I"
    assert r["provenance"][0]["source_row"] == 472
    assert r["total_min"] == r["total_max"] == 1000.0


def test_house_range_and_fallback(client):
    assert calc(client, address_id="KB.3", beds=1).json()["pausal"]["amount"] == 100.0
    r = calc(client, address_id="KB.4", beds=1).json()
    assert r["pausal"]["level"] == "municipality"
    assert r["pausal"]["amount"] == 150.0
    assert "house_number_outside_listed_ranges" in r["warnings"]


def test_missing_rate_is_reported(client):
    r = calc(client, address_id="KB.5", beds=2, camp_units=3).json()
    assert r["pausal"]["amount"] == 398.16  # beds only
    assert r["pausal"]["missing_rates"] == ["camp_unit"]
    assert {"unit": "camp_unit", "count": 3, "rate": None, "amount": None} in r["pausal"]["lines"]
    assert "rate_not_published_for_unit_type" in r["warnings"]


def test_property_tax_range_and_exemption(client):
    r = calc(client, address_id="KB.1", area_m2=100).json()
    pt = r["property_tax"]
    assert (pt["amount_min"], pt["amount_max"]) == (60.0, 500.0)
    assert pt["previous"]["year"] == 2025
    assert "property_tax_depends_on_zone" in r["warnings"]

    r = calc(client, address_id="KB.1", area_m2=100, is_primary_residence=True).json()
    assert r["property_tax"]["exempt"] and r["property_tax"]["amount_max"] == 0.0


def test_property_tax_billed_by_municipality(client):
    r = calc(client, address_id="KB.9", area_m2=50).json()
    assert r["property_tax"]["amount_min"] == 50.0
    assert "property_tax_billed_by_municipality" in r["warnings"]


def test_ambiguous_official_table_widens_total(client):
    r = calc(client, address_id="KB.9", beds=3).json()
    assert "official_table_ambiguous_for_this_municipality" in r["warnings"]
    amounts = {r["pausal"]["amount"], *(a["amount"] for a in r["pausal"]["alternatives"])}
    assert amounts == {60.0, 180.0}
    assert (r["total_min"], r["total_max"]) == (60.0, 180.0)


def test_ambiguous_address_needs_a_municipality(client):
    r = calc(client, address_id="KB.10", beds=1)
    assert r.status_code == 409
    assert [c["code"] for c in r.json()["detail"]["candidates"]] == [981, 100]

    r = calc(client, address_id="KB.10", beds=1, municipality_code=100)
    assert r.status_code == 200 and r.json()["pausal"]["amount"] == 120.0
    assert "official_table_row_assigned_by_inference" in r.json()["warnings"]
    assert calc(client, address_id="KB.10", municipality_code=1333).status_code == 422
    assert calc(client, address_id="KB.1", municipality_code=100).status_code == 422


def test_input_validation(client):
    assert calc(client, address_id="KB.1", beds=-1).status_code == 422
    assert calc(client, address_id="KB.1", area_m2=0).status_code == 422
    assert calc(client, address_id="nope").status_code == 404


def test_no_inputs_gives_no_total(client):
    r = calc(client, address_id="KB.1").json()
    assert r["pausal"]["amount"] == 0.0
    assert r["property_tax"]["amount_min"] is None


# ---- municipalities and meta


def test_municipality_detail(client):
    m = client.get("/api/municipalities/981").json()
    assert len(m["pausal_rules"]) == 3
    assert [y["year"] for y in m["years"]] == [2025, 2026]
    assert m["legal_range"]["max_amount"] == 300.0
    assert client.get("/api/municipalities/1").status_code == 404


def test_municipality_list_filter(client):
    names = [m["name"] for m in client.get("/api/municipalities", params={"q": "otok"}).json()]
    assert names == ["Otok", "Otok"]


def test_neighbours(client):
    n = client.get("/api/municipalities/981/neighbours", params={"limit": 2}).json()
    assert n[0]["name"] == "Konavle" and n[0]["pausal_rate_bed"] == 120.0
    assert n[0]["distance_km"] < 25
    # Otok has two municipality-wide rates in the official table -> no single rate
    otok = client.get("/api/municipalities/1333/neighbours").json()
    assert all(o["pausal_rate_bed"] is None for o in otok if o["name"] == "Otok")


def test_sources_and_health(client):
    s = client.get("/api/meta/sources").json()
    assert {d["key"] for d in s["datasets"]} >= {"porezna_pausal", "dgu_addresses"}
    assert client.get("/api/health").json()["tax_year"] == "2026"
    assert client.get("/api/openapi.json").status_code == 200
