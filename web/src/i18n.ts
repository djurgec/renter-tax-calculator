import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const hr = {
  appName: 'PorezniKompas',
  tagline: 'Lokalni porezi za iznajmljivače, za svaku adresu u Hrvatskoj',
  nav: { calculator: 'Kalkulator', municipalities: 'Općine i gradovi', about: 'O podacima' },
  language: 'English',
  languageLabel: 'Switch to English',
  footer:
    'Informativni izračun iz otvorenih podataka Porezne uprave, DGU-a, MPUDT-a i Hrvatske pošte. Konačni iznos utvrđuje porezno tijelo rješenjem.',
  mapCredit: 'Obris karte: Natural Earth.',
  loading: 'Učitavanje…',
  error: 'Nešto nije u redu. Pokušajte ponovno.',
  apiDown: 'Poslužitelj nije dostupan. Je li API pokrenut?',
  calc: {
    title: 'Paušal i porez na nekretnine za vašu adresu',
    intro: 'Upišite adresu nekretnine, broj kreveta i površinu.',
  },
  search: {
    label: 'Adresa nekretnine',
    placeholder: 'npr. Ilica 1 Zagreb ili Šercera 4 Dubrovnik',
    hint: 'Upišite ulicu, kućni broj i mjesto.',
    noResults: 'Nema rezultata. Provjerite naziv ulice ili mjesta.',
    searching: 'Tražim…',
    street: 'ulica',
    addresses: '{{count}} adresa',
    pickNumber: 'Odaberite kućni broj',
    filterNumbers: 'Kućni broj',
    noNumbers: 'Nema tog kućnog broja.',
    more: '…i još {{count}}. Upišite broj za suženje.',
    change: 'Promijeni adresu',
  },
  address: {
    municipality: 'Općina / grad',
    pickTitle: 'Kojoj općini pripada ova adresa?',
    ambiguousHelp:
      'Naselje s ovim imenom i poštanskim brojem postoji u više općina. Odaberite onu u kojoj je nekretnina.',
    unknownHelp:
      'Nismo mogli pouzdano odrediti općinu za ovu adresu. Odaberite je s popisa.',
    searchMunicipality: 'Potražite općinu ili grad',
  },
  form: {
    title: 'Što iznajmljujete?',
    beds: 'Kreveti',
    bedsHelp: 'Osnovni kreveti u sobama, apartmanima i kućama za odmor',
    campUnits: 'Smještajne jedinice u kampu',
    campHelp: 'Kamp ili kamp-odmorište u domaćinstvu',
    robinson: 'Robinzonske smještajne jedinice',
    robinsonHelp: 'Objekti za robinzonski smještaj',
    area: 'Korisna površina (m²)',
    areaHelp: 'Za porez na nekretnine. Ostavite prazno ako vas ne zanima.',
    primary: 'U ovoj nekretnini imam prebivalište i stalno stanujem',
    decrease: 'Smanji',
    increase: 'Povećaj',
  },
  result: {
    title: 'Godišnji porez',
    empty: 'Odaberite adresu da biste vidjeli izračun.',
    total: 'Ukupno godišnje',
    pausal: 'Paušalni porez na dohodak od iznajmljivanja',
    propertyTax: 'Porez na nekretnine',
    level: {
      house_range: 'Stopa za kućne brojeve {{from}}–{{to}} u ulici {{street}}',
      street: 'Stopa za ulicu {{street}}',
      settlement: 'Stopa za naselje {{settlement}}',
      municipality: 'Stopa za cijelu općinu / grad',
    },
    parity: { even: 'parna strana', odd: 'neparna strana' },
    perUnit: '{{count}} × {{rate}}',
    rateMissing: 'stopa nije objavljena',
    legalRange: 'Zakonski raspon za kategoriju {{category}}',
    legalRangeHelp:
      'Općina određuje iznos po krevetu unutar raspona propisanog za njezinu kategoriju turističke razvijenosti.',
    defaultAmount: 'zadano {{amount}}',
    yourRate: 'vaša stopa',
    alternatives: 'Moguće i:',
    noRule: 'Za ovu adresu u tablici nema stope paušalnog poreza.',
    noUnits: 'Unesite broj kreveta ili smještajnih jedinica.',
    enterArea: 'Unesite površinu za izračun.',
    exempt: 'Oslobođeno – nekretnina za stalno stanovanje',
    rate: '{{rate}} po m²',
    zoneRange: 'od {{min}} do {{max}} po m², ovisno o zoni',
    previous: 'U {{year}}.: {{raw}} €/m²',
    noRate: 'Stopa nije objavljena',
    billedBy: {
      PU: 'Rješenje šalje Porezna uprava',
      JLS: 'Rješenje šalje općina / grad',
    },
    howCalculated: 'Kako smo izračunali',
    row: 'redak {{row}}',
    downloaded: 'preuzeto {{date}}',
    municipalityPage: 'Sve stope za {{name}}',
    disclaimer:
      'Informativni izračun. Konačni iznos utvrđuje porezno tijelo rješenjem; provjerite odluku svoje općine.',
  },
  chart: {
    title: 'Paušal po krevetu, 2026.',
    sea: 'Jadransko more',
    label: 'Karta Hrvatske: paušalni porez po krevetu za {{count}} općina i gradova',
    upTo: 'do {{amount}}',
    between: '{{from}}–{{to}}',
    andMore: '{{amount}} i više',
    several: 'više stopa',
    yourAddress: 'vaša adresa',
    perBed: '{{amount}} po krevetu',
    rangePerBed: '{{from}}–{{to}} po krevetu',
    noRate: 'nema stope',
    neighbours: 'Brojke oko adrese: stope susjednih općina',
    open: 'Otvori {{name}}',
    zoomOut: 'Cijela Hrvatska',
    zoomIn: 'Približi adresu',
    loadError: 'Općine se ne mogu prikazati na karti: API nije odgovorio na /api/map. Ponovno pokrenite API (uv run porezni-kompas-api) da učita najnoviji kod.',
  },
  units: {
    bed: 'krevet',
    camp_unit: 'jedinica u kampu',
    robinson_unit: 'robinzonska jedinica',
  },
  warnings: {
    title: 'Napomene',
    house_number_outside_listed_ranges:
      'Ulica je u tablici navedena samo za neke kućne brojeve; vaš broj nije među njima pa je primijenjena opća stopa.',
    house_number_needed_for_even_odd_rule:
      'Stopa za ovu ulicu ovisi o parnoj ili neparnoj strani, a kućni broj nije prepoznat.',
    address_not_listed_in_municipality_table:
      'Općina je propisala stope samo za određena naselja ili ulice, a ova adresa nije među njima. Provjerite s općinom.',
    no_rule_for_municipality: 'Za ovu općinu nema objavljene stope paušalnog poreza.',
    official_table_ambiguous_for_this_municipality:
      'Službena tablica ne razlikuje dvije općine istog imena; prikazan je raspon obiju stopa.',
    several_rates_match: 'Za adresu odgovara više stopa; ukupni iznos prikazan je kao raspon.',
    rate_not_published_for_unit_type:
      'Za neku od vrsta smještaja stopa nije objavljena pa nije uračunata.',
    property_tax_exempt_primary_residence:
      'Porez na nekretnine ne plaća se za nekretninu u kojoj stalno stanujete.',
    property_tax_depends_on_zone:
      'Općina ima različite stope po zonama; točan iznos ovisi o zoni u kojoj je nekretnina.',
    property_tax_rate_missing: 'Za ovu općinu nema objavljene stope poreza na nekretnine.',
    property_tax_billed_by_municipality:
      'Porez na nekretnine utvrđuje i naplaćuje sama općina, ne Porezna uprava.',
    official_table_row_assigned_by_inference:
      'Službena tablica ne navodi jednoznačno općinu za ovaj redak; povezali smo ga zaključivanjem. Provjerite s općinom.',
  },
  muni: {
    listTitle: 'Općine i gradovi',
    listIntro: 'Stope paušalnog poreza i poreza na nekretnine za svih {{count}} općina i gradova.',
    filter: 'Filtriraj po imenu',
    category: 'Kategorija {{category}}',
    noCategory: 'bez kategorije',
    county: 'Županija',
    taxesTitle: 'Lokalni porezi',
    year: 'Godina',
    propertyTax: 'Porez na nekretnine (€/m²)',
    incomeTax: 'Porez na dohodak (niža / viša stopa)',
    consumptionTax: 'Porez na potrošnju',
    rulesTitle: 'Paušalni porez po smještajnoj jedinici ({{year}}.)',
    rulesCount: '{{count}} pravila',
    filterRules: 'Filtriraj po naselju ili ulici',
    where: 'Gdje vrijedi',
    everywhere: 'Cijela općina',
    perBed: 'Po krevetu',
    perCamp: 'Kamp',
    perRobinson: 'Robinzon',
    source: 'Redak',
    houseNumbers: 'kbr. {{from}}–{{to}}',
    neighboursTitle: 'Usporedba sa susjedima',
    distance: 'Udaljenost',
    variesBy: 'ovisno o naselju',
    ambiguous: 'Službena tablica za ovu općinu nije jednoznačna.',
    notFound: 'Općina nije pronađena.',
    back: 'Svi gradovi i općine',
  },
  about: {
    title: 'O podacima',
    intro:
      'PorezniKompas spaja pet otvorenih skupova podataka u jednu bazu. Svaki izračun navodi redak službene tablice iz kojeg dolazi.',
    coverage: 'Pokrivenost',
    addresses: 'adresa u registru DGU-a',
    resolved: 'adresa povezano s općinom',
    built: 'Baza izgrađena',
    checksTitle: 'Provjere kvalitete pri svakoj izgradnji',
    passed: 'prošlo',
    failed: 'nije prošlo',
    datasetsTitle: 'Izvori',
    dataset: 'Skup podataka',
    publisher: 'Izdavač',
    licence: 'Licencija',
    size: 'Veličina',
    downloaded: 'Preuzeto',
    api: 'Otvoreni API i dokumentacija',
  },
  datasets: {
    porezna_pausal: 'Visina paušalnog poreza na dohodak po JLS za 2026.',
    porezna_property: 'Porez na nekretnine po JLS, 2025. i 2026.',
    porezna_income: 'Stope poreza na dohodak po JLS, 2025. i 2026.',
    porezna_consumption: 'Stope poreza na potrošnju po JLS za 2026.',
    dgu_addresses: 'Adrese (INSPIRE), registar adresa',
    dgu_admin_units: 'Administrativne jedinice (INSPIRE): naselja i općine',
    voters: 'Broj birača po adresi',
    posta: 'Naselja i poštanski brojevi',
  },
  checks: {
    'address count': 'Broj adresa',
    'addresses resolved to a municipality': 'Udio adresa povezanih s općinom',
    'street-level rules found in the address data': 'Ulice iz tablice pronađene u registru adresa',
    'all municipalities in the master list': 'Sve 556 općina i gradova na popisu',
    'register of spatial units linked to the tax tables':
      'Registar prostornih jedinica povezan s poreznim tablicama',
    'register agrees with the name-based method':
      'Registar i provjera po imenima naselja daju istu općinu',
    'every municipality has a county': 'Svaka općina ima županiju',
    'municipalities with a property-tax entry': 'Svaka općina ima stopu poreza na nekretnine',
    'municipalities covered by flat-rate rules': 'Svaka općina ima paušalni porez',
    'per-bed amounts inside the legal range of their category':
      'Iznosi po krevetu unutar zakonskog raspona kategorije',
    'address coordinates inside Croatia': 'Koordinate svih adresa unutar Hrvatske',
    'every flat-rate row assigned to a municipality': 'Svaki redak paušalne tablice povezan s općinom',
  },
  notFound: 'Stranica ne postoji.',
}

type Dict = typeof hr

const en: Dict = {
  appName: 'PorezniKompas',
  tagline: 'Local taxes for private renters, for every address in Croatia',
  nav: { calculator: 'Calculator', municipalities: 'Municipalities', about: 'About the data' },
  language: 'Hrvatski',
  languageLabel: 'Prebaci na hrvatski',
  footer:
    'Indicative calculation from open data by Porezna uprava, DGU, MPUDT and Hrvatska pošta. The final amount is set by the tax authority.',
  mapCredit: 'Map outline: Natural Earth.',
  loading: 'Loading…',
  error: 'Something went wrong. Please try again.',
  apiDown: 'The server is not reachable. Is the API running?',
  calc: {
    title: 'Flat-rate and property tax for your address',
    intro: 'Enter the property address, the number of beds and the floor area.',
  },
  search: {
    label: 'Property address',
    placeholder: 'e.g. Ilica 1 Zagreb or Šercera 4 Dubrovnik',
    hint: 'Type the street, house number and place.',
    noResults: 'No results. Check the street or place name.',
    searching: 'Searching…',
    street: 'street',
    addresses: '{{count}} addresses',
    pickNumber: 'Pick the house number',
    filterNumbers: 'House number',
    noNumbers: 'No such house number.',
    more: '…and {{count}} more. Type a number to narrow down.',
    change: 'Change address',
  },
  address: {
    municipality: 'Municipality',
    pickTitle: 'Which municipality is this address in?',
    ambiguousHelp:
      'A settlement with this name and postcode exists in more than one municipality. Pick the one the property is in.',
    unknownHelp: 'We could not reliably find the municipality for this address. Pick it from the list.',
    searchMunicipality: 'Search for a municipality',
  },
  form: {
    title: 'What do you rent out?',
    beds: 'Beds',
    bedsHelp: 'Main beds in rooms, apartments and holiday homes',
    campUnits: 'Camp pitches',
    campHelp: 'Camp or small camp site at a household',
    robinson: 'Robinson units',
    robinsonHelp: 'Robinson-style (off-grid) accommodation',
    area: 'Floor area (m²)',
    areaHelp: 'For property tax. Leave empty to skip it.',
    primary: 'This is my registered permanent residence',
    decrease: 'Decrease',
    increase: 'Increase',
  },
  result: {
    title: 'Yearly tax',
    empty: 'Pick an address to see the calculation.',
    total: 'Total per year',
    pausal: 'Flat-rate income tax on renting',
    propertyTax: 'Property tax',
    level: {
      house_range: 'Rate for house numbers {{from}}–{{to}} on {{street}}',
      street: 'Rate for {{street}}',
      settlement: 'Rate for the settlement of {{settlement}}',
      municipality: 'Municipality-wide rate',
    },
    parity: { even: 'even side', odd: 'odd side' },
    perUnit: '{{count}} × {{rate}}',
    rateMissing: 'rate not published',
    legalRange: 'Legal range for category {{category}}',
    legalRangeHelp:
      "Each municipality sets the per-bed amount within the range for its tourism development category.",
    defaultAmount: 'default {{amount}}',
    yourRate: 'your rate',
    alternatives: 'Also possible:',
    noRule: 'The official table has no flat-rate amount for this address.',
    noUnits: 'Enter the number of beds or units.',
    enterArea: 'Enter the floor area to calculate it.',
    exempt: 'Exempt – permanent residence',
    rate: '{{rate}} per m²',
    zoneRange: '{{min}} to {{max}} per m², depending on the zone',
    previous: 'In {{year}}: {{raw}} €/m²',
    noRate: 'Rate not published',
    billedBy: {
      PU: 'Billed by Porezna uprava (tax administration)',
      JLS: 'Billed by the municipality',
    },
    howCalculated: 'How we calculated this',
    row: 'row {{row}}',
    downloaded: 'downloaded {{date}}',
    municipalityPage: 'All rates for {{name}}',
    disclaimer:
      "Indicative only. The tax authority sets the final amount; check your municipality's decision.",
  },
  chart: {
    title: 'Flat-rate tax per bed, 2026',
    sea: 'Adriatic Sea',
    label: 'Map of Croatia: flat-rate tax per bed for {{count}} municipalities',
    upTo: 'up to {{amount}}',
    between: '{{from}}–{{to}}',
    andMore: '{{amount}} and more',
    several: 'several rates',
    yourAddress: 'your address',
    perBed: '{{amount}} per bed',
    rangePerBed: '{{from}}–{{to}} per bed',
    noRate: 'no rate',
    neighbours: 'Figures around the address: neighbouring municipalities’ rates',
    open: 'Open {{name}}',
    zoomOut: 'All of Croatia',
    zoomIn: 'Zoom to address',
    loadError: 'The municipalities cannot be shown on the map: the API did not answer /api/map. Restart the API (uv run porezni-kompas-api) so it loads the latest code.',
  },
  units: { bed: 'bed', camp_unit: 'camp pitch', robinson_unit: 'robinson unit' },
  warnings: {
    title: 'Notes',
    house_number_outside_listed_ranges:
      'The table lists this street only for some house numbers; yours is not among them, so the general rate applies.',
    house_number_needed_for_even_odd_rule:
      'The rate on this street depends on the even or odd side, and the house number was not recognised.',
    address_not_listed_in_municipality_table:
      'The municipality set rates only for certain settlements or streets, and this address is not among them. Check with the municipality.',
    no_rule_for_municipality: 'No flat-rate amount is published for this municipality.',
    official_table_ambiguous_for_this_municipality:
      'The official table does not distinguish two municipalities with the same name; both rates are shown as a range.',
    several_rates_match: 'Several rates match this address; the total is shown as a range.',
    rate_not_published_for_unit_type:
      'No rate is published for one of the accommodation types, so it is not included.',
    property_tax_exempt_primary_residence:
      'No property tax is due on a property you permanently live in.',
    property_tax_depends_on_zone:
      'The municipality has different rates per zone; the exact amount depends on the zone of the property.',
    property_tax_rate_missing: 'No property tax rate is published for this municipality.',
    property_tax_billed_by_municipality:
      'Property tax is assessed and collected by the municipality itself, not by Porezna uprava.',
    official_table_row_assigned_by_inference:
      'The official table does not name the municipality for this row unambiguously; we matched it by inference. Check with the municipality.',
  },
  muni: {
    listTitle: 'Municipalities',
    listIntro: 'Flat-rate and property tax rates for all {{count}} municipalities and towns.',
    filter: 'Filter by name',
    category: 'Category {{category}}',
    noCategory: 'no category',
    county: 'County',
    taxesTitle: 'Local taxes',
    year: 'Year',
    propertyTax: 'Property tax (€/m²)',
    incomeTax: 'Income tax (lower / higher rate)',
    consumptionTax: 'Consumption tax',
    rulesTitle: 'Flat-rate tax per unit ({{year}})',
    rulesCount: '{{count}} rules',
    filterRules: 'Filter by settlement or street',
    where: 'Applies to',
    everywhere: 'Whole municipality',
    perBed: 'Per bed',
    perCamp: 'Camp',
    perRobinson: 'Robinson',
    source: 'Row',
    houseNumbers: 'no. {{from}}–{{to}}',
    neighboursTitle: 'Compared with neighbours',
    distance: 'Distance',
    variesBy: 'varies by settlement',
    ambiguous: 'The official table for this municipality is ambiguous.',
    notFound: 'Municipality not found.',
    back: 'All municipalities',
  },
  about: {
    title: 'About the data',
    intro:
      'PorezniKompas joins five open datasets into one database. Every calculation cites the row of the official table it comes from.',
    coverage: 'Coverage',
    addresses: 'addresses in the DGU register',
    resolved: 'addresses linked to a municipality',
    built: 'Database built',
    checksTitle: 'Quality checks on every build',
    passed: 'passed',
    failed: 'failed',
    datasetsTitle: 'Sources',
    dataset: 'Dataset',
    publisher: 'Publisher',
    licence: 'Licence',
    size: 'Size',
    downloaded: 'Downloaded',
    api: 'Open API and documentation',
  },
  datasets: {
    porezna_pausal: 'Flat-rate income tax by municipality, 2026',
    porezna_property: 'Property tax by municipality, 2025 and 2026',
    porezna_income: 'Income tax rates by municipality, 2025 and 2026',
    porezna_consumption: 'Consumption tax rates by municipality, 2026',
    dgu_addresses: 'Addresses (INSPIRE), address register',
    dgu_admin_units: 'Administrative units (INSPIRE): settlements and municipalities',
    voters: 'Number of voters per address',
    posta: 'Settlements and postcodes',
  },
  checks: {
    'address count': 'Address count',
    'addresses resolved to a municipality': 'Share of addresses linked to a municipality',
    'street-level rules found in the address data': 'Streets from the table found in the address register',
    'all municipalities in the master list': 'All 556 municipalities in the list',
    'register of spatial units linked to the tax tables':
      'Register of spatial units linked to the tax tables',
    'register agrees with the name-based method':
      'Register and the settlement-name check agree on the municipality',
    'every municipality has a county': 'Every municipality has a county',
    'municipalities with a property-tax entry': 'Every municipality has a property tax rate',
    'municipalities covered by flat-rate rules': 'Every municipality has a flat-rate tax',
    'per-bed amounts inside the legal range of their category':
      'Per-bed amounts inside the legal range of their category',
    'address coordinates inside Croatia': 'Every address coordinate inside Croatia',
    'every flat-rate row assigned to a municipality': 'Every flat-rate row linked to a municipality',
  },
  notFound: 'Page not found.',
}

function initialLanguage(): string {
  try {
    return localStorage.getItem('pk-lang') ?? 'hr'
  } catch {
    return 'hr'
  }
}

export function setLanguage(lng: string) {
  void i18n.changeLanguage(lng)
  document.documentElement.lang = lng
  try {
    localStorage.setItem('pk-lang', lng)
  } catch {
    // storage blocked: the choice lasts for this page only
  }
}

void i18n.use(initReactI18next).init({
  resources: { hr: { translation: hr }, en: { translation: en } },
  lng: initialLanguage(),
  fallbackLng: 'hr',
  interpolation: { escapeValue: false },
})
document.documentElement.lang = i18n.language

export default i18n
