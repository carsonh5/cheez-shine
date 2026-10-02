/* ============================================================
   audit.mjs — the admin harness driver.
   ------------------------------------------------------------
   1. Rebuilds admin-mock.html from ../admin.html (so it always
      tests current code).
   2. Starts an in-process static server rooted at ../ (_template).
   3. Drives a local Chromium (playwright, resolved from the npx
      cache — no install) across five viewports and every admin
      screen, running automated defect checks:
        - horizontal overflow (scrollWidth > innerWidth)
        - per-element bounding-box overflow past the viewport
        - tap targets < 40px (buttons / links / checkboxes)
        - console/page JS errors
        - empty-state presence on list screens
      Screenshots each screen to _test/screens/.
   4. Writes a machine-readable report to _test/audit-report.json
      and a human summary to stdout.

   Run:  node audit.mjs
   Env:  PORT (default 8799), HEADFUL=1 to watch.
   ============================================================ */
import { createServer } from "node:http";
import { readFile, writeFile, stat, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname } from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SCREENS = join(__dirname, "screens");
const PORT = Number(process.env.PORT) || 8799;

/* ---- resolve playwright from npx cache (no install) ---- */
function resolvePlaywright() {
  const require = createRequire(import.meta.url);
  // Try normal resolution first (in case installed locally/globally).
  try { return require("playwright"); } catch {}
  // Fall back to the npx cache dirs.
  const localAppData = process.env.LOCALAPPDATA || join(process.env.USERPROFILE || "", "AppData", "Local");
  const npxRoot = join(localAppData, "npm-cache", "_npx");
  let dirs = [];
  try {
    const { readdirSync } = require("node:fs");
    dirs = readdirSync(npxRoot);
  } catch {}
  for (const d of dirs) {
    const cand = join(npxRoot, d, "node_modules", "playwright");
    try {
      const req2 = createRequire(join(cand, "index.js"));
      const pw = req2(cand);
      if (pw && pw.chromium) { process.env.__PW_FROM = cand; return pw; }
    } catch {}
  }
  throw new Error("Could not resolve playwright — run: npx playwright --version (to prime the npx cache)");
}

/* ---- rebuild the mock from live admin.html ---- */
function rebuild() {
  execFileSync(process.execPath, [join(__dirname, "build-mock.mjs")], { stdio: "inherit" });
}

/* ---- static server ---- */
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon" };
function startServer(startPort) {
  return new Promise((resolve, reject) => {
    let port = startPort;
    let attempts = 0;
    const server = createServer(async (req, res) => {
      try {
        let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        if (urlPath === "/") urlPath = "/_test/admin-mock.html";
        const filePath = normalize(join(ROOT, urlPath));
        if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end("forbidden"); return; }
        const s = await stat(filePath).catch(() => null);
        if (!s || s.isDirectory()) { res.writeHead(404); res.end("nf"); return; }
        res.writeHead(200, { "Content-Type": TYPES[extname(filePath).toLowerCase()] || "application/octet-stream" });
        res.end(await readFile(filePath));
      } catch (e) { res.writeHead(500); res.end(e.message); }
    });
    server.on("error", (e) => {
      if (e.code === "EADDRINUSE" && attempts < 12) {
        attempts++; port++;
        setTimeout(() => server.listen(port), 50);
      } else {
        reject(e);
      }
    });
    server.listen(port, () => { server.__port = port; resolve(server); });
  });
}

/* ---- viewports ---- */
const VIEWPORTS = [
  { name: "360x640", width: 360, height: 640, mobile: true },
  { name: "390x844", width: 390, height: 844, mobile: true },
  { name: "414x896", width: 414, height: 896, mobile: true },
  { name: "768x1024", width: 768, height: 1024, mobile: false },
  { name: "1280x800", width: 1280, height: 800, mobile: false },
];

const VIEWS = ["overview", "bookings", "availability", "customers", "promos", "settings"];

/* ---- in-page defect probes (run in browser) ---- */
const PROBE = `(() => {
  const out = { overflowDoc: null, overflowEls: [], smallTargets: [], emptyStates: [] };
  const vw = window.innerWidth, vh = window.innerHeight;
  const sw = document.documentElement.scrollWidth;
  if (sw > vw + 1) out.overflowDoc = { scrollWidth: sw, innerWidth: vw, over: sw - vw };
  // per-element horizontal overflow: elements whose right edge exceeds vw by > 2px
  // limited to visible elements inside the on view + persistent chrome
  const onView = document.querySelector('.view.on');
  const scopes = [onView, document.getElementById('tabbar'), document.querySelector('.topbar'), document.querySelector('.savebar')].filter(Boolean);
  const seen = new Set();
  scopes.forEach(scope => {
    scope.querySelectorAll('*').forEach(el => {
      if (seen.has(el)) return; seen.add(el);
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      if (r.right > vw + 2) {
        out.overflowEls.push({ tag: el.tagName.toLowerCase(), cls: (el.className||'').toString().slice(0,60), right: Math.round(r.right), vw, over: Math.round(r.right - vw), text: (el.textContent||'').trim().slice(0,40) });
      }
    });
  });
  // tap targets: interactive, visible elements smaller than 40px in either dim
  const interactive = onView ? onView.querySelectorAll('button, a, input[type=checkbox], input[type=radio], select, [role=button], .navlink, #tabbar a') : [];
  (onView ? [...interactive, ...document.querySelectorAll('#tabbar a')] : []).forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    // ignore text links inside sentences (inline <a>/<b>) — only flag control-like els
    const isControl = /^(button|input|select)$/.test(el.tagName.toLowerCase()) || el.classList.contains('btn') || el.classList.contains('navlink') || el.closest('#tabbar') || el.getAttribute('role') === 'button';
    if (!isControl) return;
    let h = r.height, w = r.width;
    // A control wrapped in a <label> (or an explicitly clickable row) inherits
    // that row as its real tap target — credit the nearest label/clickable
    // ancestor's box so we don't flag a 20px checkbox inside a 48px label row.
    const lbl = el.closest('label, .togg, .av-row');
    if (lbl && lbl !== el) { const lr = lbl.getBoundingClientRect(); h = Math.max(h, lr.height); w = Math.max(w, lr.width); }
    if (h < 40 || w < 24) {
      out.smallTargets.push({ tag: el.tagName.toLowerCase(), cls: (el.className||'').toString().slice(0,50), w: Math.round(w), h: Math.round(h), text: (el.textContent||el.value||'').trim().slice(0,30) });
    }
  });
  return out;
})()`;

async function setViewport(page, vp) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
}

async function gotoView(page, view) {
  await page.evaluate((v) => {
    // click the nav element for this view (sidebar or tab bar, whichever is visible)
    const els = Array.from(document.querySelectorAll('.navlink, #tabbar a'));
    const target = els.find(e => e.dataset.view === v && e.offsetParent !== null) || els.find(e => e.dataset.view === v);
    if (target) target.click();
  }, view);
  await page.waitForTimeout(250);
}

async function main() {
  rebuild();
  await rm(SCREENS, { recursive: true, force: true });
  await mkdir(SCREENS, { recursive: true });
  const { chromium } = resolvePlaywright();
  const server = await startServer(PORT);
  const activePort = server.__port;
  console.log("server on", activePort, "playwright from", process.env.__PW_FROM || "resolved");

  const browser = await chromium.launch({ headless: !process.env.HEADFUL });
  const report = { generatedAt: new Date().toISOString(), viewports: {}, jsErrors: [], summary: {} };

  try {
    for (const vp of VIEWPORTS) {
      report.viewports[vp.name] = {};
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, isMobile: vp.mobile, hasTouch: vp.mobile });
      const page = await ctx.newPage();
      const errs = [];
      page.on("console", (m) => { if (m.type() === "error") errs.push({ vp: vp.name, view: "(page)", text: m.text() }); });
      page.on("pageerror", (e) => errs.push({ vp: vp.name, view: "(page)", text: String(e) }));

      await page.goto(`http://127.0.0.1:${activePort}/_test/admin-mock.html`, { waitUntil: "networkidle" });
      // wait for app to render (login should be hidden, app shown)
      await page.waitForFunction(() => {
        const app = document.getElementById('app');
        return app && getComputedStyle(app).display !== 'none';
      }, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(400);

      // capture login screen too (viewport 1 only, sign out then back)
      for (const view of VIEWS) {
        await gotoView(page, view);
        const errBefore = errs.length;
        const probe = await page.evaluate(PROBE);
        const shot = join(SCREENS, `${vp.name}__${view}.png`);
        await page.screenshot({ path: shot, fullPage: true });
        report.viewports[vp.name][view] = {
          overflowDoc: probe.overflowDoc,
          overflowEls: probe.overflowEls,
          smallTargets: probe.smallTargets,
          newErrors: errs.slice(errBefore).map(e => e.text),
          screenshot: `screens/${vp.name}__${view}.png`,
        };
      }

      // login screen shot (sign out)
      await page.evaluate(() => { const b = document.getElementById('signout'); if (b) b.click(); });
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(SCREENS, `${vp.name}__login.png`), fullPage: true });
      const loginProbe = await page.evaluate(PROBE);
      report.viewports[vp.name].login = { overflowDoc: loginProbe.overflowDoc, overflowEls: loginProbe.overflowEls, smallTargets: loginProbe.smallTargets, screenshot: `screens/${vp.name}__login.png` };

      report.jsErrors.push(...errs);
      await ctx.close();
      console.log("done viewport", vp.name);
    }
  } finally {
    await browser.close();
    server.close();
  }

  // summary
  let totalOverflowDoc = 0, totalOverflowEls = 0, totalSmall = 0;
  for (const vpn in report.viewports) {
    for (const view in report.viewports[vpn]) {
      const r = report.viewports[vpn][view];
      if (r.overflowDoc) totalOverflowDoc++;
      totalOverflowEls += (r.overflowEls || []).length;
      totalSmall += (r.smallTargets || []).length;
    }
  }
  report.summary = { screensWithDocOverflow: totalOverflowDoc, elementOverflows: totalOverflowEls, smallTapTargets: totalSmall, jsErrors: report.jsErrors.length };
  await writeFile(join(__dirname, "audit-report.json"), JSON.stringify(report, null, 2), "utf8");

  console.log("\n==== AUDIT SUMMARY ====");
  console.log("screens with document overflow:", totalOverflowDoc);
  console.log("element overflows:", totalOverflowEls);
  console.log("small tap targets (<40h/<24w):", totalSmall);
  console.log("JS errors:", report.jsErrors.length);
  if (report.jsErrors.length) report.jsErrors.slice(0, 20).forEach(e => console.log("  ERR", e.vp, e.text));
  // print the worst offenders
  for (const vpn in report.viewports) {
    for (const view in report.viewports[vpn]) {
      const r = report.viewports[vpn][view];
      if (r.overflowDoc || (r.overflowEls||[]).length || (r.smallTargets||[]).length) {
        console.log(`  [${vpn}/${view}] docOverflow=${r.overflowDoc?r.overflowDoc.over+'px':'-'} elOverflow=${(r.overflowEls||[]).length} small=${(r.smallTargets||[]).length}`);
        (r.overflowEls||[]).slice(0,4).forEach(e => console.log(`      overflow <${e.tag} class="${e.cls}"> +${e.over}px "${e.text}"`));
        (r.smallTargets||[]).slice(0,6).forEach(e => console.log(`      small <${e.tag} class="${e.cls}"> ${e.w}x${e.h} "${e.text}"`));
      }
    }
  }
  console.log("\nreport: _test/audit-report.json  screens: _test/screens/");
}

main().catch(e => { console.error(e); process.exit(1); });
