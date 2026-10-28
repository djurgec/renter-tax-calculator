-- PorezniKompas database. Built by the ETL, read-only for the API.

CREATE TABLE municipality (
    code INTEGER PRIMARY KEY,          -- official Porezna municipality code
    name TEXT NOT NULL,
    name_key TEXT NOT NULL,
    county TEXT,
    county_key TEXT,
    tourism_category TEXT,             -- I, II, III, IV, 0
    pausal_source_ambiguous INTEGER NOT NULL DEFAULT 0,
    lat REAL, lon REAL                 -- mean of the municipality's address points
);

CREATE TABLE pausal_rule (
    id INTEGER PRIMARY KEY,
    year INTEGER NOT NULL,
    municipality_code INTEGER NOT NULL REFERENCES municipality(code),
    level TEXT NOT NULL,               -- house_range | street | settlement | municipality
    settlement TEXT, settlement_key TEXT,
    street TEXT, street_key TEXT,      -- street_key is matched to the address data
    street_match TEXT,                 -- exact | fuzzy | unmatched | NULL
    house_from INTEGER, house_to INTEGER,
    parity TEXT,                       -- even | odd | NULL
    rate_bed REAL, rate_camp_unit REAL, rate_robinson REAL,
    category TEXT,
    source_row INTEGER NOT NULL,       -- row in the official XLSX
    source_ambiguous INTEGER NOT NULL DEFAULT 0,
    assignment_inferred INTEGER NOT NULL DEFAULT 0  -- row matched to the municipality by
                                                    -- inference, not by an official document
);
CREATE INDEX pausal_rule_municipality ON pausal_rule(municipality_code);

CREATE TABLE property_tax (
    municipality_code INTEGER NOT NULL REFERENCES municipality(code),
    year INTEGER NOT NULL,
    rate_min REAL, rate_max REAL, is_range INTEGER NOT NULL, raw TEXT,
    administered_by TEXT,              -- PU (Porezna uprava) | JLS (municipality)
    PRIMARY KEY (municipality_code, year)
);

CREATE TABLE income_tax (
    municipality_code INTEGER NOT NULL REFERENCES municipality(code),
    year INTEGER NOT NULL, lower REAL, higher REAL,
    PRIMARY KEY (municipality_code, year)
);

CREATE TABLE consumption_tax (
    municipality_code INTEGER NOT NULL REFERENCES municipality(code),
    year INTEGER NOT NULL, rate REAL,
    PRIMARY KEY (municipality_code, year)
);

CREATE TABLE legal_range (
    category TEXT PRIMARY KEY, min_amount REAL, max_amount REAL, default_amount REAL
);

-- One row per street (settlement + postcode + street name) in the DGU register
CREATE TABLE street (
    id INTEGER PRIMARY KEY,
    street TEXT NOT NULL, street_key TEXT NOT NULL,
    settlement TEXT NOT NULL, settlement_key TEXT NOT NULL, settlement_code TEXT,
    postcode TEXT,
    municipality_code INTEGER REFERENCES municipality(code),   -- NULL if ambiguous
    candidate_codes TEXT,              -- JSON list when ambiguous
    resolution TEXT NOT NULL,          -- postcode_county | unique_settlement | ambiguous | unknown
    label TEXT NOT NULL,
    address_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX street_settlement ON street(settlement_key);

CREATE VIRTUAL TABLE street_fts USING fts5(
    label, content='street', content_rowid='id', tokenize='trigram remove_diacritics 1'
);

CREATE TABLE address (
    id TEXT PRIMARY KEY,               -- DGU localId
    street_id INTEGER NOT NULL REFERENCES street(id),
    house_number TEXT, house_int INTEGER,
    lat REAL, lon REAL,
    pausal_rule_id INTEGER REFERENCES pausal_rule(id),
    pausal_level TEXT,
    pausal_warnings TEXT               -- JSON list
) WITHOUT ROWID;
CREATE INDEX address_street ON address(street_id, house_int);

CREATE TABLE dataset_meta (
    key TEXT PRIMARY KEY, url TEXT, publisher TEXT, dataset TEXT, licence TEXT,
    bytes INTEGER, sha256 TEXT, last_modified TEXT, downloaded_at TEXT
);

CREATE TABLE build_info (key TEXT PRIMARY KEY, value TEXT);
