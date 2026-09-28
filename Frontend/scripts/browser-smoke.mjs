import { chromium } from 'playwright-core'

const baseUrl = process.env.POLAROPS_BASE_URL || 'http://127.0.0.1:5173'
const checkOffline = process.env.POLAROPS_CHECK_OFFLINE === '1'
const appOrigin = new URL(baseUrl).origin
let offlinePhase = false

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', (error) => errors.push('pageerror ' + error.message))
page.on('response', (response) => { const url = new URL(response.url()); if (url.origin === appOrigin && response.status() >= 400) errors.push(response.status() + ' ' + response.url()) })
page.on('requestfailed', (request) => { const url = new URL(request.url()); const reason = request.failure()?.errorText || ''; if (url.origin === appOrigin && reason !== 'net::ERR_ABORTED' && !(offlinePhase && url.pathname.startsWith('/api/'))) errors.push('requestfailed ' + request.url() + ' ' + reason) })

await page.goto(baseUrl + '/login', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /sign in to command console/i }).click()
await page.waitForTimeout(1500)
if (!page.url().includes('/dashboard')) {
  const alertText = await page.locator('.alert-box').allTextContents()
  throw new Error('Login did not navigate. URL=' + page.url() + ' alerts=' + alertText.join(' | ') + ' console=' + errors.join(' | '))
}
await page.waitForURL('**/dashboard', { timeout: 10000 })
await page.getByRole('heading', { name: /Expedition Alpha/i }).waitFor()
const dashboardCards = await page.locator('.metric-card').count()
if (dashboardCards < 6) throw new Error('Dashboard metric cards did not render')
await page.locator('.live-dot').filter({ hasText: 'LIVE' }).waitFor({ timeout: 10000 })

const apiChecks = await page.evaluate(async () => {
  const token = localStorage.getItem('polarops.session')
  const paths = [
    '/api/personnel?expedition_id=1','/api/cargo?expedition_id=1','/api/inventory?expedition_id=1',
    '/api/vehicles?expedition_id=1','/api/assets?expedition_id=1','/api/incidents?expedition_id=1',
    '/api/ops/tasks?expedition_id=1','/api/ops/routes?expedition_id=1','/api/ops/alerts?expedition_id=1',
    '/api/ops/science?expedition_id=1','/api/ops/comms?expedition_id=1','/api/ops/readiness?expedition_id=1',
    '/api/ops/handovers?expedition_id=1','/api/ops/audit?expedition_id=1',
    '/api/environment/overview?expedition_id=1','/api/activity?expedition_id=1',
  ]
  return Promise.all(paths.map(async (path) => [path, (await fetch(path, { headers:{ authorization:'Bearer ' + token } })).status]))
})
const failedApi = apiChecks.filter(([, status]) => status !== 200)
if (failedApi.length) throw new Error('API smoke failures: ' + JSON.stringify(failedApi))

const roleChecks = await page.evaluate(async () => {
  const accounts = [
    ['logistics@polarops.local','Logistics123!','logistics'],
    ['field@polarops.local','Field123!','field'],
  ]
  return Promise.all(accounts.map(async ([email,password,role]) => {
    const response = await fetch('/api/auth/login', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({email,password}) })
    const data = await response.json()
    return [role,response.status,data.user?.role]
  }))
})
if (roleChecks.some(([expected,status,actual]) => status !== 200 || expected !== actual)) {
  throw new Error('Role login smoke failures: ' + JSON.stringify(roleChecks))
}

await page.getByRole('link', { name: /Routes & Zones/i }).click()
await page.waitForURL('**/routes')
await page.getByRole('heading', { name: /Routes & Zones/i }).waitFor()
await page.locator('.leaflet-container').waitFor({ timeout: 10000 })
const routeForms = await page.locator('.route-form').count()
if (routeForms !== 2) throw new Error('Expected route and geofence forms')

const modules = [
  ['Personnel','Personnel'], ['Cargo','Cargo'], ['Inventory','Inventory'], ['Assets','Assets'],
  ['Vehicles','Vehicles'], ['Incidents','Incidents'], ['Operations','Operations'], ['Science','Science'],
  ['Communications','Communications'], ['Readiness','Expedition Readiness'], ['Environment','Environment'],
  ['Activity','Activity & Audit'], ['Settings','Settings'],
]
for (const [link, heading] of modules) {
  await page.getByRole('link', { name:link, exact:true }).click()
  await page.getByRole('heading', { name:heading, exact:true }).waitFor({ timeout:10000 })
}

await page.getByRole('link', { name: /Polar Network/i }).click()
await page.waitForURL('**/network')
await page.getByRole('heading', { name: /Polar Network/i }).waitFor()
await page.getByRole('button', { name: /Arctic \/ North/i }).click()

let offlineShell = false
if (checkOffline) {
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, { timeout: 10000 })
  await page.waitForTimeout(1000)
  const cacheUrls = await page.evaluate(async () => (await (await caches.open('polarops-react-shell-v1')).keys()).map((request) => request.url))
  offlinePhase = true
  await page.context().setOffline(true)
  const offlineResponse = await page.reload({ waitUntil:'domcontentloaded' })
  await page.waitForTimeout(800)
  const offlineMeta = { status:offlineResponse?.status(), fromServiceWorker:offlineResponse?.fromServiceWorker() }
  const offlineBody = await page.locator('body').innerText().catch(() => '')
  if (!offlineBody.includes('Polar Network')) throw new Error('Offline reload failed. url=' + page.url() + ' cache=' + JSON.stringify(cacheUrls) + ' meta=' + JSON.stringify(offlineMeta) + ' errors=' + errors.join(' | ') + ' body=' + offlineBody.slice(0,400))
  await page.getByRole('heading', { name:/Polar Network/i }).waitFor({ timeout:10000 })
  offlineShell = true
  await page.context().setOffline(false)
}

if (errors.length) throw new Error('Browser console errors: ' + errors.join(' | '))
console.log(JSON.stringify({ ok:true, dashboardCards, routeForms, offlineShell, url:page.url() }))
await browser.close()
