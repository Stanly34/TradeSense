const BASE = 'http://localhost:5000/api/v1'
const EMAIL = 'demo@tradesense.app'
const PASSWORD = 'Demo123!'

let token = null

export async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  const json = await res.json()
  token = json?.data?.accessToken
  if (!token) throw new Error('login failed: ' + JSON.stringify(json).slice(0, 200))
  return token
}

let lastReq = 0
export async function api(path, opts = {}, retries = 5) {
  const minGap = 1100
  const wait = lastReq + minGap - Date.now()
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
  lastReq = Date.now()
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  if (res.status === 429 && retries > 0) {
    const ra = parseInt(res.headers.get('retry-after') || '30', 10)
    console.log(`  429 rate-limited, waiting ${ra}s`)
    await new Promise(r => setTimeout(r, ra * 1000 + 500))
    return api(path, opts, retries - 1)
  }
  const json = await res.json().catch(() => ({}))
  return { status: res.status, ok: res.ok, data: json?.data, json }
}

export function parseSizeK(sizeName) {
  const m = String(sizeName).toLowerCase().match(/([\d.]+)\s*k/)
  if (m) return Math.round(parseFloat(m[1]) * 1000)
  const n = parseFloat(String(sizeName).replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

export function isFutures(instruments) {
  return String(instruments || '').toLowerCase().includes('futur')
}

export function detectType(evalRules = []) {
  const all = evalRules.map(r => `${r.label} ${r.value}`).join(' | ').toLowerCase()
  if (/eod trailing|end-of-day trailing|end of day trailing/.test(all)) return 'EOD_TRAILING'
  if (/trailing/.test(all)) return 'TRAILING'
  return 'STATIC'
}

export function pctOf(val, size) {
  if (val == null) return 0
  const s = String(val)
  if (s.includes('%')) return (parseFloat(s) / 100) * size
  const n = parseFloat(s.replace(/[$,]/g, ''))
  return isNaN(n) ? 0 : n
}

export function ruleVal(evalRules = [], ...patterns) {
  for (const p of patterns) {
    const hit = evalRules.find(r => new RegExp(p, 'i').test(`${r.label}`))
    if (hit) return hit.value
  }
  return null
}
