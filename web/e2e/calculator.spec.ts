import { expect, searchAddress, test, total } from './fixtures'

// Expected amounts come from the test database in tests/conftest.py.
// Amounts are formatted for hr-HR ("1.196,32 €"); \s also matches the no-break space.

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('shows an empty result until an address is chosen', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Koliko poreza')
  await expect(page.getByText('Odaberite adresu da biste vidjeli izračun.')).toBeVisible()
})

test('calculates flat-rate and property tax for an address', async ({ page }) => {
  await searchAddress(page, 'ilica 1 zagreb', 'Ilica 1, Zagreb')
  await expect(page.getByText('Općina / grad: Zagreb, Grad Zagreb')).toBeVisible()

  await page.getByRole('spinbutton', { name: 'Kreveti' }).fill('4')
  await page.getByLabel('Korisna površina (m²)').fill('80')

  // 4 beds × 199,08 € + 80 m² × 5 €
  await expect(total(page)).toHaveText(/^1\.196,32\s€$/)
  await expect(page).toHaveURL(/[?&]a=KB\.5(&|$)/)
  await expect(page).toHaveURL(/[?&]b=4(&|$)/)
  await expect(page).toHaveURL(/[?&]p=80(&|$)/)
})

test('the + and − buttons change the number of beds', async ({ page }) => {
  await searchAddress(page, 'ilica 1 zagreb', 'Ilica 1, Zagreb')
  const beds = page.getByRole('spinbutton', { name: 'Kreveti' })
  const plus = page.getByRole('button', { name: /: Kreveti$/ }).last()
  const minus = page.getByRole('button', { name: /: Kreveti$/ }).first()

  await expect(minus).toBeDisabled()
  await plus.click()
  await plus.click()
  await expect(beds).toHaveValue('2')
  await expect(total(page)).toHaveText(/^398,16\s€$/)
  await minus.click()
  await expect(beds).toHaveValue('1')
  await expect(total(page)).toHaveText(/^199,08\s€$/)
})

test('a shared link restores the calculation', async ({ page }) => {
  await page.goto('/?a=KB.3&b=2')
  await expect(page.getByText('Ulica dr. Ante Šercera 4', { exact: false }).first()).toBeVisible()
  // house-number range rule for Šercera 1–6: 100 € per bed
  await expect(total(page)).toHaveText(/^200\s€$/)
})

test('picking a street then a house number selects the address', async ({ page }) => {
  await searchAddress(page, 'šercera dubrovnik', 'Ulica dr. Ante Šercera')
  const numbers = page.getByRole('group', { name: 'Odaberite kućni broj' })
  await expect(numbers.getByRole('button')).toHaveText(['4', '40'])

  await numbers.getByRole('button', { name: '40', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Promijeni adresu' })).toBeVisible()
  await expect(page).toHaveURL(/[?&]a=KB\.4(&|$)/)
})

test('asks for the municipality when the address is ambiguous', async ({ page }) => {
  await searchAddress(page, 'mlini', 'Ulica Mlini')
  await page.getByRole('group', { name: 'Odaberite kućni broj' }).getByRole('button', { name: '7' }).click()

  const choice = page.getByRole('group', { name: 'Kojoj općini pripada ova adresa?' })
  await expect(choice.getByRole('radio')).toHaveCount(2)
  await page.getByRole('spinbutton', { name: 'Kreveti' }).fill('1')
  await expect(page.getByText('Odaberite adresu da biste vidjeli izračun.')).toBeVisible()

  await choice.getByRole('radio', { name: /Konavle/ }).check()
  await expect(total(page)).toHaveText(/^120\s€$/)
  await expect(page).toHaveURL(/[?&]m=100(&|$)/)
})

test('a permanent residence pays no property tax', async ({ page }) => {
  await page.goto('/?a=KB.5&p=80')
  await expect(total(page)).toHaveText(/^400\s€$/)

  await page.getByRole('checkbox', { name: /stalno stanujem/ }).check()
  await expect(page.getByText('Oslobođeno – nekretnina za stalno stanovanje')).toBeVisible()
  await expect(total(page)).toHaveText(/^0\s€$/)
})

test('"Promijeni adresu" goes back to the search', async ({ page }) => {
  await page.goto('/?a=KB.5&b=1')
  await page.getByRole('button', { name: 'Promijeni adresu' }).click()
  await expect(page.getByRole('combobox', { name: 'Adresa nekretnine' })).toBeVisible()
  await expect(page).not.toHaveURL(/[?&]a=/)
})

test('the chart shows every municipality and marks the chosen address', async ({ page }) => {
  const chart = page.getByRole('img', { name: /paušalni porez po krevetu za 5 općina/ })
  await expect(chart).toBeVisible()
  await expect(chart.locator('circle')).toHaveCount(5)

  await page.goto('/?a=KB.3&b=2')
  await expect(page.getByText('vaša adresa')).toBeVisible()
  // neighbours' rates appear as soundings around the fix (Konavle: 120 per bed)
  await expect(chart.locator('text', { hasText: /^120$/ })).toBeVisible()
  await page.getByRole('button', { name: 'Cijela Hrvatska' }).click()
  await expect(page.getByRole('button', { name: 'Približi adresu' })).toBeVisible()
})

test('on a phone the total follows the form and leads back to the result', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'the sticky total exists only on small screens')
  await page.goto('/?a=KB.5&b=4&p=80')
  await expect(total(page)).toHaveText(/^1\.196,32\s€$/)

  await page.getByRole('spinbutton', { name: 'Kreveti' }).scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: /: Kreveti$/ }).last().click()
  const bar = page.getByRole('button', { name: /Ukupno godišnje.*1\.395,40/ })
  await expect(bar).toBeVisible()
  await bar.click()
  await expect(total(page)).toBeInViewport()
})

test('says so when the map data cannot be loaded (e.g. an API started before an update)', async ({ page }) => {
  await page.route('**/api/map', (route) => route.fulfill({ status: 404, body: '{"detail":"Not Found"}' }))
  await page.goto('/')
  await expect(page.getByRole('alert').filter({ hasText: '/api/map' })).toBeVisible()
})
