import { test as base, expect, type Page } from '@playwright/test'

// Every test runs offline: requests that leave localhost (map tiles) are dropped, so a
// slow or missing network never changes a result.
export const test = base.extend({
  // Playwright calls the second argument `use`; renamed so React's hook lint rule ignores it
  context: async ({ context }, provide) => {
    await context.route(/^https?:\/\/(?!(localhost|127\.0\.0\.1)[:/])/, (route) => route.abort())
    await provide(context)
  },
})

export { expect }

/** The big "total per year" amount on the result card. */
export const total = (page: Page) =>
  page.getByRole('heading', { name: 'Ukupno godišnje' }).locator('xpath=following-sibling::p')

/** Type into the address combobox and pick the option whose label starts with `option`. */
export async function searchAddress(page: Page, query: string, option: string) {
  await page.getByRole('combobox', { name: 'Adresa nekretnine' }).fill(query)
  await page.getByRole('option', { name: new RegExp(`^${option}`) }).click()
}
