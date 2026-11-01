"""Single source of truth for every dataset the ETL uses."""

from dataclasses import dataclass

_PORTAL = "https://data.gov.hr/ckan/dataset"
_POREZNA_DATASET = "Usporedba poreznih stopa prema odlukama jedinica lokalne samouprave u RH"


@dataclass(frozen=True)
class Source:
    key: str
    url: str
    filename: str
    publisher: str
    dataset: str
    licence: str
    min_bytes: int  # sanity check: anything smaller is an error page


SOURCES: dict[str, Source] = {
    s.key: s
    for s in [
        Source(
            key="porezna_pausal",
            url=f"{_PORTAL}/3c19c044-4cc4-42f1-ac97-29286a2bf305/resource/"
            "3af4f470-c3b8-4e25-83b0-7224fda1216b/download/"
            "visina-paualnog-poreza-na-dohodak-po-jls-za-2026.-godinu.xlsx",
            filename="pausal_2026.xlsx",
            publisher="Porezna uprava",
            dataset=_POREZNA_DATASET,
            licence="Otvorena dozvola",
            min_bytes=50_000,
        ),
        Source(
            key="porezna_property",
            url=f"{_PORTAL}/3c19c044-4cc4-42f1-ac97-29286a2bf305/resource/"
            "341a1ef0-4de9-4960-afb7-7eb629be5192/download/usporedba-poreza-na-nekretnine-25_26-1.xlsx",
            filename="property_2025_2026.xlsx",
            publisher="Porezna uprava",
            dataset=_POREZNA_DATASET,
            licence="Otvorena dozvola",
            min_bytes=20_000,
        ),
        Source(
            key="porezna_income",
            url=f"{_PORTAL}/3c19c044-4cc4-42f1-ac97-29286a2bf305/resource/"
            "a33cb1d7-969f-498f-9e9d-0d6eddd9cd87/download/"
            "stope_poreza_na_dohodak_usporedba-2025-i-2026.xlsx",
            filename="income_2025_2026.xlsx",
            publisher="Porezna uprava",
            dataset=_POREZNA_DATASET,
            licence="Otvorena dozvola",
            min_bytes=50_000,
        ),
        Source(
            key="porezna_consumption",
            url=f"{_PORTAL}/3c19c044-4cc4-42f1-ac97-29286a2bf305/resource/"
            "7e17aa53-12a3-40c4-92df-3ea253737bbb/download/"
            "visina-stopa-poreza-na-potronju-za-2026.-godinu.xlsx",
            filename="consumption_2026.xlsx",
            publisher="Porezna uprava",
            dataset=_POREZNA_DATASET,
            licence="Otvorena dozvola",
            min_bytes=20_000,
        ),
        Source(
            key="dgu_addresses",
            url="https://geoportal.dgu.hr/services/atom/INSPIRE_Addresses_(AD).zip",
            filename="INSPIRE_Addresses_AD.zip",
            publisher="Državna geodetska uprava",
            dataset="Adrese INSPIRE",
            licence="Otvorena dozvola",
            min_bytes=50_000_000,
        ),
        Source(
            key="dgu_admin_units",
            url="https://geoportal.dgu.hr/services/atom/INSPIRE_Administrative_Units_(AU).zip",
            filename="INSPIRE_Administrative_Units_AU.zip",
            publisher="Državna geodetska uprava",
            dataset="Administrativne jedinice INSPIRE (Registar prostornih jedinica)",
            licence="Otvorena dozvola",
            min_bytes=100_000_000,
        ),
        Source(
            key="voters",
            url=f"{_PORTAL}/a4f06d5d-52bd-46b5-a4e7-cf01d4f6e227/resource/"
            "d3e8f75b-41cc-4e15-a3b6-c1cf3816c2bc/download/bb_po_adresi_13_05_2026.csv",
            filename="voters_by_address.csv",
            publisher="Ministarstvo pravosuđa, uprave i digitalne transformacije",
            dataset="Registar birača - Broj birača po adresi",
            licence="Otvorena dozvola",
            min_bytes=50_000_000,
        ),
        Source(
            key="posta",
            url="https://www.posta.hr/mjestaRh.aspx",
            filename="posta_settlements.xlsx",
            publisher="Hrvatska pošta d.d.",
            dataset="Naselje i odredišni poštanski ured",
            licence="Otvorena dozvola",
            min_bytes=100_000,
        ),
    ]
}
