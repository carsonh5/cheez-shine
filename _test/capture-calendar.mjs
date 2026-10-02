/* Focused visual capture of the calendar-bar features:
   day-tap detail with block toggle, blocked-day distinct styling,
   double-booking warning dialog text, upcoming one-tap confirm.
   Run: node capture-calendar.mjs  (rebuilds mock first) */
import { createServer } from "node:http";
import { readFile, stat, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname } from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, ".."), SCREENS = join(__dirname, "screens");
const PORT = 8822;
function resolvePlaywright() {
  const require = createRequire(import.meta.url);
  try { return require("playwright"); } catch {}
  const npxRoot = join(process.env.LOCALAPPDATA, "npm-cache", "_npx");
  const { readdirSync } = require("node:fs");
  for (const d of readdirSync(npxRoot)) { const cand = join(npxRoot, d, "node_modules", "playwright"); try { const r = createRequire(join(cand, "index.js")); const pw = r(cand); if (pw && pw.chromium) return pw; } catch {} }
  throw new Error("no pw");
}
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon" };
function startServer(p) { return new Promise((res, rej) => { let port = p, a = 0; const s = createServer(async (rq, rs) => { try { let u = decodeURIComponent((rq.url || "/").split("?")[0]); if (u === "/") u = "/_test/admin-mock.html"; const fp = normalize(join(ROOT, u)); if (!fp.startsWith(ROOT)) { rs.writeHead(403); rs.end(); return; } const st = await stat(fp).catch(() => null); if (!st || st.isDirectory()) { rs.writeHead(404); rs.end(); return; } rs.writeHead(200, { "Content-Type": TYPES[extname(fp).toLowerCase()] || "application/octet-stream" }); rs.end(await readFile(fp)); } catch (e) { rs.writeHead(500); rs.end(e.message); } }); s.on("error", e => { if (e.code === "EADDRINUSE" && a < 12) { a++; port++; setTimeout(() => s.listen(port), 50); } else rej(e); }); s.listen(port, () => { s.__port = port; res(s); }); }); }

async function main() {
  execFileSync(process.execPath, [join(__dirname, "build-mock.mjs")], { stdio: "inherit" });
  await mkdir(SCREENS, { recursive: true });
  const { chromium } = resolvePlaywright();
  const server = await startServer(PORT); const port = server.__port;
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  let lastDialog = "";
  page.on("dialog", d => { lastDialog = d.message(); d.dismiss(); }); // dismiss to keep state, capture text
  await page.goto(`http://127.0.0.1:${port}/_test/admin-mock.html`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => { const a = document.getElementById('app'); return a && getComputedStyle(a).display !== 'none'; }, { timeout: 8000 });
  await page.waitForTimeout(400);

  // go to availability
  await page.evaluate(() => { const t = [...document.querySelectorAll('#tabbar a')].find(a => a.dataset.view === 'availability'); t.click(); });
  await page.waitForTimeout(400);

  // tap the first booking day and screenshot the day detail
  await page.evaluate(() => { const c = document.querySelector('#calWrap .cal-c.cal-has[data-day]'); if (c) c.scrollIntoView({ block: 'center' }); c && c.click(); });
  await page.waitForTimeout(300);
  const cd = await page.$('#calDay');
  if (cd) await cd.screenshot({ path: join(SCREENS, 'CAL_day-detail.png') });
  console.log("day-detail captured; calDay text:", (await page.evaluate(() => document.getElementById('calDay').textContent)).slice(0, 120));

  // trigger the "block a day that has bookings" warning
  await page.evaluate(() => { const b = document.getElementById('calBlock'); if (b) b.click(); });
  await page.waitForTimeout(200);
  console.log("BLOCK-WITH-BOOKINGS DIALOG:\n" + lastDialog + "\n");

  // now test the double-booking guard: confirm the overlapping pair.
  // Find the two bookings sharing a date+time; confirm the first, then confirm the second -> warn.
  await page.evaluate(() => { const t = [...document.querySelectorAll('#tabbar a')].find(a => a.dataset.view === 'bookings'); t.click(); });
  await page.waitForTimeout(300);
  // confirm bk with Priya (D.in5 Morning), then Tom (same) -> should warn
  const ids = await page.evaluate(() => {
    const st = window.__MOCK_STORE;
    const arr = [...st.bookings.entries()].map(([id, d]) => ({ id, ...d }));
    // find same date+time pair among 'new'
    const key = {}; arr.forEach(b => { if ((b.status || 'new') === 'new' && b.date && b.time) { const k = b.date + '|' + b.time; (key[k] = key[k] || []).push(b.id); } });
    const pair = Object.values(key).find(v => v.length >= 2);
    return pair || [];
  });
  console.log("overlapping new pair ids:", ids);
  if (ids.length >= 2) {
    // confirm first (auto-accept none needed, first has no confirmed clash yet)
    page.removeAllListeners("dialog"); page.on("dialog", d => { lastDialog = d.message(); d.accept(); });
    await page.evaluate((id) => { const r = document.querySelector(`.row[data-id="${id}"] [data-act="confirm"]`); if (r) r.click(); }, ids[0]);
    await page.waitForTimeout(400);
    // now confirm the second -> should warn (dialog captured)
    lastDialog = "";
    page.removeAllListeners("dialog"); page.on("dialog", d => { lastDialog = d.message(); d.dismiss(); });
    await page.evaluate((id) => { const r = document.querySelector(`.row[data-id="${id}"] [data-act="confirm"]`); if (r) r.click(); }, ids[1]);
    await page.waitForTimeout(300);
    console.log("DOUBLE-BOOKING GUARD DIALOG:\n" + lastDialog + "\n");
  }

  await browser.close(); server.close();
}
main().catch(e => { console.error(e); process.exit(1); });
