/* ============================================================
   functional.mjs — behavioral tests for admin.html via the mock.
   Exercises real flows and asserts the in-memory store round-trips.
   Run:  node functional.mjs   (rebuilds mock first)
   ============================================================ */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname } from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PORT = Number(process.env.PORT) || 8811;

function resolvePlaywright() {
  const require = createRequire(import.meta.url);
  try { return require("playwright"); } catch {}
  const localAppData = process.env.LOCALAPPDATA || join(process.env.USERPROFILE || "", "AppData", "Local");
  const npxRoot = join(localAppData, "npm-cache", "_npx");
  const { readdirSync } = require("node:fs");
  for (const d of readdirSync(npxRoot)) {
    const cand = join(npxRoot, d, "node_modules", "playwright");
    try { const req2 = createRequire(join(cand, "index.js")); const pw = req2(cand); if (pw && pw.chromium) return pw; } catch {}
  }
  throw new Error("no playwright");
}
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon" };
function startServer(startPort) {
  return new Promise((resolve, reject) => {
    let port = startPort, attempts = 0;
    const server = createServer(async (req, res) => {
      try {
        let u = decodeURIComponent((req.url || "/").split("?")[0]);
        if (u === "/") u = "/_test/admin-mock.html";
        const fp = normalize(join(ROOT, u));
        if (!fp.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
        const s = await stat(fp).catch(() => null);
        if (!s || s.isDirectory()) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { "Content-Type": TYPES[extname(fp).toLowerCase()] || "application/octet-stream" });
        res.end(await readFile(fp));
      } catch (e) { res.writeHead(500); res.end(e.message); }
    });
    server.on("error", (e) => { if (e.code === "EADDRINUSE" && attempts < 12) { attempts++; port++; setTimeout(() => server.listen(port), 50); } else reject(e); });
    server.listen(port, () => { server.__port = port; resolve(server); });
  });
}

const results = [];
function check(name, cond, detail) { results.push({ name, pass: !!cond, detail: detail || "" }); console.log((cond ? "PASS " : "FAIL ") + name + (detail ? "  — " + detail : "")); }

async function main() {
  execFileSync(process.execPath, [join(__dirname, "build-mock.mjs")], { stdio: "inherit" });
  const { chromium } = resolvePlaywright();
  const server = await startServer(PORT);
  const port = server.__port;
  const browser = await chromium.launch({ headless: !process.env.HEADFUL });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  // auto-accept confirm() dialogs
  page.on("dialog", (d) => d.accept());

  await page.goto(`http://127.0.0.1:${port}/_test/admin-mock.html`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => { const a = document.getElementById('app'); return a && getComputedStyle(a).display !== 'none'; }, { timeout: 8000 });
  await page.waitForTimeout(400);

  // 1. store seeded
  const seeded = await page.evaluate(() => window.__MOCK_STORE ? window.__MOCK_STORE.bookings.size : -1);
  check("store seeded with bookings", seeded >= 20, "count=" + seeded);

  // 2. overview stats render
  const statCount = await page.evaluate(() => document.querySelectorAll('#statCards .stat').length);
  check("overview stat cards render", statCount >= 4, "cards=" + statCount);

  // 3. go to bookings, confirm a NEW booking -> status persists in store
  await page.evaluate(() => { const t = [...document.querySelectorAll('#tabbar a')].find(a => a.dataset.view === 'bookings'); t && t.click(); });
  await page.waitForTimeout(300);
  const firstNew = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#bookingsPanel .row[data-id]')];
    const r = rows.find(x => x.querySelector('.badge.b-new'));
    if (!r) return null;
    const id = r.dataset.id;
    const btn = r.querySelector('[data-act="confirm"]');
    if (btn) btn.click();
    return id;
  });
  await page.waitForTimeout(400);
  const confirmedInStore = await page.evaluate((id) => window.__MOCK_STORE.bookings.get(id)?.status, firstNew);
  check("confirm booking persists to store", confirmedInStore === "confirmed", "id=" + firstNew + " status=" + confirmedInStore);

  // 4. confirming also blocks the slot (blockSlotForBooking)
  const blockedAfterConfirm = await page.evaluate((id) => {
    const b = window.__MOCK_STORE.bookings.get(id);
    const bl = window.__MOCK_STORE.site.availability.blocked || [];
    return bl.some(x => x.date === b.date && (x.slot || "") === (b.time || ""));
  }, firstNew);
  check("confirm blocks the booking's slot", blockedAfterConfirm, "");

  // 5. mark a booking done -> persists
  const doneId = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#bookingsPanel .row[data-id]')];
    const r = rows.find(x => x.querySelector('[data-act="done"]'));
    if (!r) return null; const id = r.dataset.id; r.querySelector('[data-act="done"]').click(); return id;
  });
  await page.waitForTimeout(400);
  const doneStatus = await page.evaluate((id) => window.__MOCK_STORE.bookings.get(id)?.status, doneId);
  check("mark done persists to store", doneStatus === "done", "status=" + doneStatus);

  // 6. availability calendar: a day with bookings is tappable and shows detail
  await page.evaluate(() => { const t = [...document.querySelectorAll('#tabbar a')].find(a => a.dataset.view === 'availability'); t && t.click(); });
  await page.waitForTimeout(400);
  const calHasClickable = await page.evaluate(() => document.querySelectorAll('#calWrap .cal-c[data-day]').length);
  check("calendar has clickable day cells", calHasClickable > 0, "days=" + calHasClickable);

  // 7. tap a booking day -> calDay populates
  const calDayShown = await page.evaluate(() => {
    const c = document.querySelector('#calWrap .cal-c[data-day]');
    if (!c) return false; c.click();
    return (document.getElementById('calDay').innerHTML || '').length > 0;
  });
  check("tap calendar day shows day detail", calDayShown, "");

  // 8. block toggle available in day detail (STEP 3 requirement)
  const dayHasBlockToggle = await page.evaluate(() => {
    const cd = document.getElementById('calDay');
    return cd && /block/i.test(cd.textContent || '');
  });
  check("calendar day detail has a block toggle", dayHasBlockToggle, "(STEP 3 requirement)");

  // 9. upcoming shows 5+ with one-tap confirm
  const upcoming = await page.evaluate(() => {
    const up = document.getElementById('upNext');
    if (!up) return { n: 0, hasConfirm: false };
    return { n: up.querySelectorAll('.up-row, .av-row').length, hasConfirm: !!up.querySelector('[data-upconfirm], [data-act="confirm"]') };
  });
  check("upcoming list shows 5+ entries", upcoming.n >= 5, "n=" + upcoming.n + " (STEP 3 wants 5+)");
  check("upcoming has one-tap confirm", upcoming.hasConfirm, "(STEP 3 requirement)");

  // 10. settings save round-trips
  await page.evaluate(() => { const t = [...document.querySelectorAll('#tabbar a')].find(a => a.dataset.view === 'settings'); t && t.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const e = document.getElementById('sPhone'); e.value = '(720) 555-9999'; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.evaluate(() => { const b = document.getElementById('sSave'); b && b.click(); });
  await page.waitForTimeout(500);
  const savedPhone = await page.evaluate(() => window.__MOCK_STORE.site.business.phone);
  check("settings save round-trips to store", savedPhone === '(720) 555-9999', "phone=" + savedPhone);

  // 11. availability save round-trips (toggle Sunday on)
  await page.evaluate(() => { const t = [...document.querySelectorAll('#tabbar a')].find(a => a.dataset.view === 'availability'); t && t.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const cb = document.querySelector('input[data-day="0"]'); if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); } });
  await page.evaluate(() => { const b = document.getElementById('avSave'); b && b.click(); });
  await page.waitForTimeout(500);
  const sundayOpen = await page.evaluate(() => window.__MOCK_STORE.site.availability.openDays[0]);
  check("availability save round-trips (Sunday on)", sundayOpen === true, "sun=" + sundayOpen);

  // 12. double-booking guard exists (confirm an overlapping booking warns)
  //     We detect whether the code path even references a clash warning.
  const hasDoubleGuard = await page.evaluate(() => {
    // heuristic: a global/DOM hint. We set window.__DOUBLE_BOOK_WARNED by the guard.
    return typeof window.__hasDoubleBookGuard !== 'undefined';
  });
  check("double-booking guard present", hasDoubleGuard, "(STEP 3 requirement)");

  // 13. customers expand history
  await page.evaluate(() => { const t = [...document.querySelectorAll('#tabbar a')].find(a => a.dataset.view === 'customers'); t && t.click(); });
  await page.waitForTimeout(300);
  const custId = await page.evaluate(() => document.querySelector('#customersPanel [data-custexp]')?.dataset.custexp);
  await page.click(`#customersPanel .bk-main[data-custexp="${custId}"] b`);
  await page.waitForTimeout(150);
  const custExpand = await page.evaluate((id) => { const w = document.querySelector(`#customersPanel [data-custdetail="${id}"]`); return { ok: w && !w.hidden, rows: w ? w.querySelectorAll('.bk-drow').length : 0 }; }, custId);
  check("customers expand history", custExpand.ok && custExpand.rows > 1, "rows=" + custExpand.rows);

  // 14. bookings filter chips filter the list
  await page.evaluate(() => { const t = [...document.querySelectorAll('#tabbar a')].find(a => a.dataset.view === 'bookings'); t && t.click(); });
  await page.waitForTimeout(200);
  const filtered = await page.evaluate(() => {
    const c = document.querySelector('[data-filter="cancelled"]'); c && c.click();
    const rows = document.querySelectorAll('#bookingsPanel .row[data-id]');
    return { n: rows.length, allCancelled: [...rows].every(r => r.querySelector('.badge.b-cancelled')) };
  });
  check("bookings filter chip narrows list", filtered.n > 0 && filtered.allCancelled, "cancelled rows=" + filtered.n);

  // 15. booking row expand detail (real click — synthetic el.click() has no e.target path)
  await page.evaluate(() => { const c = document.querySelector('[data-filter="all"]'); c && c.click(); });
  await page.waitForTimeout(150);
  const expId = await page.evaluate(() => document.querySelector('#bookingsPanel .bk-main[data-expand]')?.dataset.expand);
  await page.click(`#bookingsPanel .bk-main[data-expand="${expId}"] b`);
  await page.waitForTimeout(150);
  const rowExpand = await page.evaluate((id) => { const w = document.querySelector(`#bookingsPanel [data-detail="${id}"]`); return w && !w.hidden; }, expId);
  check("booking row expands detail", rowExpand, "");

  check("no JS errors during flows", errs.length === 0, errs.slice(0, 5).join(" | "));

  await browser.close();
  server.close();

  const passed = results.filter(r => r.pass).length;
  console.log(`\n==== FUNCTIONAL: ${passed}/${results.length} passed ====`);
  const failed = results.filter(r => !r.pass);
  if (failed.length) { console.log("FAILURES:"); failed.forEach(f => console.log("  - " + f.name + (f.detail ? " (" + f.detail + ")" : ""))); }
}
main().catch(e => { console.error(e); process.exit(1); });
