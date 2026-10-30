import { expect, test } from './fixtures'

test('lists municipalities and filters them by name', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Općine i gradovi' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Općine i gradovi')

  const list = page.getByRole('main').getByRole('listitem')
  await expect(list).toHaveCount(5)
  // the filter matches the county too: "dubr" finds Dubrovnik and Konavle
  await page.getByLabel('Filtriraj po imenu').fill('dubr')
  await expect(list).toHaveCount(2)
  await page.getByLabel('Filtriraj po imenu').fill('konavle')
  await expect(list).toHaveCount(1)
  await list.getByRole('link').click()
  await expect(page).toHaveURL(/\/opcine\/100$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Konavle')
})

test('switches the language to English and remembers it', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Switch to English' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'What do you rent out?' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  await page.reload()
  await expect(page.getByRole('button', { name: 'Prebaci na hrvatski' })).toBeVisible()
})

test('unknown pages show the not-found page', async ({ page }) => {
  await page.goto('/ne-postoji')
  await expect(page.getByRole('link', { name: /kalkulator/i }).first()).toBeVisible()
})
