// node scripts/gen-og.mjs [page ...]
//
// Writes one 1200x630 Open Graph / Twitter share image per docs page into images/og/<page>.png (index: home.png),
// in the same card design as chatflows.io (see chatflows-io-mainsite/scripts/gen-og.mjs), and keeps each page's
// frontmatter pointing at it ("og:image", "og:image:alt", "twitter:image", "twitter:image:alt").
//
// Pages come from docs.json navigation; text comes from each page's own frontmatter title and description, so
// re-run it after changing either, or after adding a page. Pass page paths (e.g. shopify/cart-recovery) to do only
// those. Fonts (Instrument Sans, JetBrains Mono) and the logo are the main site's, kept in scripts/og/.
// Rendering uses a Chrome on the machine (headless); set BROWSER_PATH to point at another Chromium.
// Commit the PNGs and the frontmatter changes: Mintlify never renders them.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS = join(ROOT, 'scripts/og')
const SITE = 'https://docs.chatflows.io'
const W = 1200
const H = 630

// Chrome binaries puppeteer downloaded, newest first.
const puppeteer = (kind, exe) => {
  const dir = join(homedir(), '.cache/puppeteer', kind)
  if (!existsSync(dir)) return []
  return readdirSync(dir).sort().reverse().map((v) => join(dir, v, `${kind}-linux64`, exe))
}
const BROWSERS = [
  process.env.BROWSER_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ...puppeteer('chrome-headless-shell', 'chrome-headless-shell'),
  ...puppeteer('chrome', 'chrome'),
]
const browser = BROWSERS.find((p) => p && existsSync(p))
if (!browser) throw new Error('No Chrome found: install one or set BROWSER_PATH')

const font = (file) => readFileSync(join(ASSETS, file)).toString('base64')
const FONTS = `
@font-face{font-family:'IS';src:url(data:font/woff2;base64,${font('instrument-sans-latin-wdth-normal.woff2')}) format('woff2');font-weight:400 700;font-stretch:75% 100%}
@font-face{font-family:'JB';src:url(data:font/woff2;base64,${font('jetbrains-mono-latin-wght-normal.woff2')}) format('woff2');font-weight:100 800}`
const LOGO = readFileSync(join(ASSETS, 'logo.svg'), 'utf8').replace('<svg ', '<svg width="56" height="56" ')

const esc = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

// Same card as chatflows.io: only the footer URL differs.
const card = ({ title, description, path }) => `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
*{box-sizing:border-box;margin:0}
body{width:${W}px;height:${H}px;overflow:hidden;background:#f7f8f2 radial-gradient(#cdd4c2 1px,transparent 1px) 0 0/18px 18px;font-family:'IS',sans-serif;color:#12160f}
.frame{position:absolute;left:36px;top:36px;width:${W - 72}px;height:${H - 72}px;border:1px solid #cdd4c2;background:#f7f8f2;padding:48px 56px 44px;display:flex;flex-direction:column}
.top{display:flex;align-items:center;justify-content:space-between;height:56px}
.brand{display:flex;align-items:center;gap:16px;font-size:38px;font-weight:700;letter-spacing:-.02em}
.tag{font-family:'JB',monospace;font-size:22px;font-weight:600;letter-spacing:.16em;color:#2d6a1e}
#mid{flex:1;min-height:0;padding:36px 0;display:flex;flex-direction:column;justify-content:center}
h1{font-weight:700;font-stretch:80%;letter-spacing:-.025em;line-height:1;text-wrap:balance}
mark{color:inherit;background:linear-gradient(transparent 62%,#a3e635 62%,#a3e635 92%,transparent 92%);padding:0 .05em;margin:0 -.05em}
p{margin-top:28px;max-width:980px;font-size:30px;line-height:1.4;font-weight:400;color:#4b5545;text-wrap:pretty}
.url{font-family:'JB',monospace;font-size:24px;font-weight:500;color:#4b5545;letter-spacing:-.01em}
</style></head><body><div class="frame">
<div class="top"><div class="brand">${LOGO}ChatFlows</div><div class="tag">FOR SHOPIFY</div></div>
<div id="mid"><h1 id="h">${esc(title).replace('WhatsApp', '<mark>WhatsApp</mark>')}</h1><p id="d">${esc(description)}</p></div>
<div class="url">${esc(path)}</div></div>
<script>document.fonts.ready.then(()=>{const fits=()=>h.offsetHeight+d.offsetHeight+28<=mid.clientHeight-72;let s=104;h.style.fontSize=s+'px';while(!fits()&&s>56){s-=4;h.style.fontSize=s+'px'}})</script>
</body></html>`

// Every MDX page in docs.json navigation (OpenAPI endpoint entries have no file and keep Mintlify's own image).
const nav = []
const walk = (x) => {
  if (typeof x === 'string') nav.push(x)
  else if (Array.isArray(x)) x.forEach(walk)
  else if (x && typeof x === 'object') for (const k of ['tabs', 'groups', 'pages', 'anchors', 'dropdowns']) if (x[k]) walk(x[k])
}
walk(JSON.parse(readFileSync(join(ROOT, 'docs.json'), 'utf8')).navigation)
const only = process.argv.slice(2).map((p) => p.replace(/^\/|\.mdx$/g, ''))
const pages = nav.filter((p) => existsSync(join(ROOT, `${p}.mdx`)) && (!only.length || only.includes(p)))
if (only.length && pages.length !== only.length) throw new Error(`Not an MDX page in docs.json navigation: ${only.filter((p) => !pages.includes(p)).join(', ')}`)

// Frontmatter values here are all plain double-quoted YAML strings; anything else stops the run.
const field = (fm, key, file) => {
  const m = fm.match(new RegExp(`^${key}:\\s*"((?:[^"\\\\]|\\\\.)*)"\\s*$`, 'm'))
  if (!m) throw new Error(`${file}: ${key} is missing or not a double-quoted string`)
  return m[1].replace(/\\(.)/g, '$1')
}
const yaml = (s) => `"${s.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
const OG_KEYS = ['og:image', 'og:image:alt', 'twitter:image', 'twitter:image:alt']

const work = join(tmpdir(), 'chatflows-docs-og')
mkdirSync(work, { recursive: true })
for (const page of pages) {
  const file = join(ROOT, `${page}.mdx`)
  const mdx = readFileSync(file, 'utf8')
  const m = mdx.match(/^---\n([\s\S]*?)\n---\n/)
  if (!m) throw new Error(`${page}.mdx: no frontmatter`)
  const title = field(m[1], 'title', `${page}.mdx`)
  const description = field(m[1], 'description', `${page}.mdx`)
  const name = page === 'index' ? 'home' : page
  const out = join(ROOT, 'images/og', `${name}.png`)
  const src = join(work, `${name.replaceAll('/', '-')}.html`)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(src, card({ title, description, path: page === 'index' ? 'docs.chatflows.io' : `docs.chatflows.io/${page}` }))
  rmSync(out, { force: true }) // so a browser that exits 0 without writing cannot leave a stale card behind
  // own profile dir: a running Chrome would otherwise take the request and write nothing
  execFileSync(browser, [
    '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${W},${H}`,
    `--user-data-dir=${join(work, 'profile')}`, '--virtual-time-budget=4000', `--screenshot=${out}`, pathToFileURL(src).href,
  ], { stdio: 'ignore' })
  const png = readFileSync(out)
  const [w, h] = [png.readUInt32BE(16), png.readUInt32BE(20)]
  if (w !== W || h !== H) throw new Error(`${out} is ${w}x${h}, expected ${W}x${H}`)

  // Point the frontmatter at the image: replace these four keys if present, else add them at the end.
  const url = `${SITE}/images/og/${name}.png`
  const alt = `ChatFlows help docs: ${title}`
  const values = { 'og:image': url, 'og:image:alt': alt, 'twitter:image': url, 'twitter:image:alt': alt }
  const kept = m[1].split('\n').filter((l) => !OG_KEYS.some((k) => l.startsWith(`"${k}":`)))
  const fm = [...kept, ...OG_KEYS.map((k) => `"${k}": ${yaml(values[k])}`)].join('\n')
  const next = mdx.replace(m[0], `---\n${fm}\n---\n`)
  if (next !== mdx) writeFileSync(file, next)
  console.log(`images/og/${name}.png  ${Math.round(png.length / 1024)} KB  ${next !== mdx ? 'frontmatter updated' : 'frontmatter ok'}  ${title}`)
}
