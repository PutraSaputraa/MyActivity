import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const baseUrl = process.env.QA_URL || 'http://127.0.0.1:5174'
const artifactsDir = new URL('../artifacts/', import.meta.url)
const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactPath = (name) => fileURLToPath(new URL(name, artifactsDir))

await fs.mkdir(artifactsDir, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
const context = await browser.newContext({
  locale: 'id-ID',
  timezoneId: 'Asia/Jakarta',
  viewport: { width: 1440, height: 960 },
})
const page = await context.newPage()
const consoleErrors = []
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})
page.on('pageerror', (error) => consoleErrors.push(error.message))

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Masuk ke akunmu' }).waitFor()
  assert.equal(await page.getByText('Tidak memerlukan akun Firebase').isVisible(), true)
  await page.screenshot({ path: artifactPath('01-login.png'), fullPage: true })

  await page.getByRole('button', { name: 'Lihat dashboard demo' }).click()
  await page.getByRole('heading', { name: /galih!/i }).waitFor()
  await page.getByText('Aktivitas minggu ini').waitFor()
  await page.screenshot({ path: artifactPath('02-dashboard.png'), fullPage: true })

  const checks = page.locator('.task-check')
  assert.ok((await checks.count()) > 0, 'Weekly board tidak memiliki checkbox aktivitas')
  const before = await checks.first().getAttribute('aria-pressed')
  await checks.first().click()
  const after = await checks.first().getAttribute('aria-pressed')
  assert.notEqual(after, before, 'Checkbox aktivitas tidak berubah')

  await page.getByRole('button', { name: 'Tambah Aktivitas', exact: true }).click()
  await page.getByPlaceholder('Contoh: Olahraga 30 menit').fill('Jurnal 10 menit')
  await page.locator('select').filter({ has: page.locator('option[value="once"]') }).selectOption('once')
  await page.getByRole('button', { name: 'Buat aktivitas' }).click()
  await page.getByText('Aktivitas berhasil ditambahkan.').waitFor()
  assert.equal(await page.getByText('Jurnal 10 menit').isVisible(), true)
  await page.getByRole('button', { name: 'Tutup notifikasi' }).click()

  await page.locator('.overview-card--agenda').click()
  await page.getByRole('heading', { name: 'Detail agenda' }).waitFor()
  await page.getByRole('heading', { name: 'Presentasi proyek' }).waitFor()
  await page.screenshot({ path: artifactPath('03-agenda-detail.png'), fullPage: false })
  await page.getByRole('button', { name: 'Tutup modal' }).click()

  await page.getByPlaceholder('Cari aktivitas atau agenda...').fill('Presentasi')
  assert.equal(await page.locator('.panel-agenda').filter({ hasText: 'Presentasi proyek' }).isVisible(), true)
  await page.getByPlaceholder('Cari aktivitas atau agenda...').fill('')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('heading', { name: 'Kalender' }).waitFor()
  assert.equal(await page.locator('.bottom-nav').isVisible(), true)
  await page.waitForTimeout(350)
  await page.screenshot({ path: artifactPath('04-mobile-calendar.png'), fullPage: true })

  await page.setViewportSize({ width: 1440, height: 960 })
  await page.getByRole('button', { name: 'Aktifkan mode gelap' }).click()
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark')
  await page.screenshot({ path: artifactPath('05-dark-calendar.png'), fullPage: false })

  assert.deepEqual(consoleErrors, [], `Browser errors: ${consoleErrors.join(' | ')}`)
  console.log(JSON.stringify({
    ok: true,
    checks: [
      'login demo',
      'dashboard dan weekly board',
      'optimistic activity completion',
      'tambah aktivitas',
      'navigasi dan detail agenda',
      'pencarian kalender',
      'layout mobile',
      'dark mode',
      'tanpa console error',
    ],
  }, null, 2))
} catch (error) {
  await page.screenshot({ path: artifactPath('failure.png'), fullPage: true }).catch(() => {})
  console.error(error)
  process.exitCode = 1
} finally {
  await browser.close()
}
