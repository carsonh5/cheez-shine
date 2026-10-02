/* Capture: filtered bookings, expanded booking detail (with photos),
   login screen, and the "not an owner" rejection path. */
import { createServer } from "node:http";
import { readFile, stat, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname } from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, ".."), SCREENS = join(__dirname, "screens");
function resolvePlaywright() { const require = createRequire(import.meta.url); try { return require("playwright"); } catch {} const npxRoot = join(process.env.LOCALAPPDATA, "npm-cache", "_npx"); const { readdirSync } = require("node:fs"); for (const d of readdirSync(npxRoot)) { const cand = join(npxRoot, d, "node_modules", "playwright"); try { const r = createRequire(join(cand, "index.js")); const pw = r(cand); if (pw && pw.chromium) return pw; } catch {} } throw new Error("no pw"); }
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon" };
function startServer(p) { return new Promise((res, rej) => { let port = p, a = 0; const s = createServer(async (rq, rs) => { try { let u = decodeURIComponent((rq.url || "/").split("?")[0]); if (u === "/") u = "/_test/admin-mock.html"; const fp = normalize(join(ROOT, u)); if (!fp.startsWith(ROOT)) { rs.writeHead(403); rs.end(); return; } const st = await stat(fp).catch(() => null); if (!st || st.isDirectory()) { rs.writeHead(404); rs.end(); return; } rs.writeHead(200, { "Content-Type": TYPES[extname(fp).toLowerCase()] || "application/octet-stream" }); rs.end(await readFile(fp)); } catch (e) { rs.writeHead(500); rs.end(e.message); } }); s.on("error", e => { if (e.code === "EADDRINUSE" && a < 12) { a++; port++; setTimeout(() => s.listen(port), 50); } else rej(e); }); s.listen(port, () => { s.__port = port; res(s); }); }); }

async function main() {
  execFileSync(process.execPath, [join(__dirname, "build-mock.mjs")], { stdio: "inherit" });
  await mkdir(SCREENS, { recursive: true });
  const { chromium } = resolvePlaywright();
  const server = await startServer(8833); const port = server.__port;
  const browser = await chromium.launch({ headless: true });

  // 1. logged-in flows
  let ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  let page = await ctx.newPage();
  page.on("dialog", d => d.accept());
  await page.goto(`http://127.0.0.1:${port}/_test/admin-mock.html`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => { const a = document.getElementById('app'); return a && getComputedStyle(a).display !== 'none'; }, { timeout: 8000 });
  await page.waitForTimeout(400);

  // bookings -> filter to New
  await page.evaluate(() => { const t = [...document.querySelectorAll('#tabbar a')].find(a => a.dataset.view === 'bookings'); t.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const c = document.querySelector('[data-filter="cancelled"]'); c && c.click(); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(SCREENS, 'BK_filter-cancelled.png'), fullPage: true });

  // back to all, expand the photos booking (Angela Whitfield)
  await page.evaluate(() => { const c = document.querySelector('[data-filter="all"]'); c && c.click(); });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const st = window.__MOCK_STORE;
    let photoId = null; st.bookings.forEach((v, k) => { if (Array.isArray(v.photos) && v.photos.length) photoId = k; });
    const el = document.querySelector(`.bk-main[data-expand="${photoId}"]`);
    if (el) { el.scrollIntoView({ block: 'center' }); el.click(); }
  });
  await page.waitForTimeout(300);
  const det = await page.$('.bk-detail-wrap:not([hidden])');
  if (det) await det.screenshot({ path: join(SCREENS, 'BK_expanded-detail.png') });
  console.log("expanded detail captured:", !!det);

  await ctx.close();

  // 2. login screen (fresh context, no auto sign-in? our mock auto-signs. Sign out then shot)
  ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/_test/admin-mock.html`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.evaluate(() => { const b = document.getElementById('signout'); if (b) b.click(); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(SCREENS, 'LOGIN_mobile.png'), fullPage: true });
  const loginShown = await page.evaluate(() => getComputedStyle(document.getElementById('login')).display !== 'none');
  console.log("login screen shown after signout:", loginShown);
  await ctx.close();

  // 3. "not an owner" path — set __MOCK_USER to a non-owner email before load
  ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  page = await ctx.newPage();
  await page.addInitScript(() => { window.__MOCK_USER = { uid: "x", email: "stranger@nowhere.com", displayName: "Stranger" }; });
  await page.goto(`http://127.0.0.1:${port}/_test/admin-mock.html`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const rej = await page.evaluate(() => ({ loginShown: getComputedStyle(document.getElementById('login')).display !== 'none', msg: document.getElementById('lMsg').textContent }));
  console.log("non-owner rejected -> login shown:", rej.loginShown, "| msg:", rej.msg);
  await page.screenshot({ path: join(SCREENS, 'LOGIN_not-owner.png'), fullPage: true });
  await ctx.close();

  await browser.close(); server.close();
}
main().catch(e => { console.error(e); process.exit(1); });
