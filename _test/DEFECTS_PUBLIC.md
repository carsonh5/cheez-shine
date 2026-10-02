# Public Site Defect Log
Audit date: 2026-09-17
Auditor: overnight loop agent (claude-sonnet-4-6)
Owned files audited: index.html, styles.css, app.js, content.js, client.config.js

Viewports tested: 320x568, 360x640, 390x844, 414x896, 768x1024, 1280x800
Tools: Playwright (headless Chrome) via node script in a temp dir outside the template
Server: python -m http.server 8140 from the template dir

---

## Defects Found, Fixed, and Verified

### D1 — Footer grid overflow with long business name (HIGH) — FIXED
**Viewports affected:** 360x640, 320x568 (any mobile viewport with a long business name)
**Symptom:** `document.body.scrollWidth=379 > innerWidth=360` under stress content
("Rancho Santa Margarita Mobile Detailing Co"). The footer `.logo <a>` element was
rendering at 355px wide inside a 312px grid cell.
**Root cause (two parts):**
1. `.foot-in` used `grid-template-columns:1fr` which resolves to `minmax(auto,1fr)` —
   the `auto` minimum lets grid tracks expand beyond the viewport when content is wider.
2. `.foot .logo` is an `<a>` (inline by default). `max-width:100%` has no effect on
   inline elements. The logo's text length drove the track wide.
**Fix in styles.css:**
- `foot-in` changed from `1fr` / `1.6fr 1fr 1fr` to `minmax(0,1fr)` / `minmax(0,1.6fr) minmax(0,1fr) minmax(0,1fr)`
- Added `display:block` to `.foot .logo` at `max-width:640px` breakpoint so `max-width:100%` + `overflow:hidden` + `text-overflow:ellipsis` take effect
**Verified:** bodyScrollW=360 at 360x640 with 40-char business name ✓

### D2 — Gallery broken-image icons visible for missing placeholder images (MEDIUM) — FIXED
**Viewports affected:** all (template ships without placeholder images)
**Symptom:** `img.complete=true, img.naturalWidth=0` — browser renders a broken-image
icon (small browser-default icon) inside the 234px-tall dark figure area.
The figure has a dark `#161618` background which shows correctly when the image
is missing, but the broken-icon sits on top of it, looking unpolished.
**Fix in styles.css:**
- Added `.grid img.img-broken { opacity: 0 }` — hides the broken icon; dark figure
  background shows as the intended placeholder
- Added `.grid figure.img-missing { cursor: default }` — visual cue that figure is
  not a clickable gallery item
**Fix in app.js `renderGallery()`:**
- Added `onerror="this.classList.add('img-broken');this.closest('figure').classList.add('img-missing')"` and `onload` counterpart to each gallery `<img>` tag
**Verified:** broken gallery images render as clean dark rectangles, no icon visible ✓

### D3 — Lightbox opened with empty/broken src when all gallery images missing (MEDIUM) — FIXED
**Viewports affected:** all (template ships without images)
**Symptom:** Clicking a gallery figure with a broken image called `open(n)` which set
`lbImg.src` to the broken `./images/gal-N.jpg` URL, showing an empty/broken lightbox.
**Fix in index.html (inline script, `__CR_bindLightbox` section):**
- Introduced `loadedImgs()` helper that filters `imgs` array to only those with
  `naturalWidth > 0`
- `open(n)` returns early if no loaded images exist
- `open(n)` maps the clicked img index to the `loadedImgs` array before opening
- `show(n)` wraps within the loaded-only array
**Verified:** clicking gallery figures with missing images does not open lightbox ✓

### D4 — City pill `<li>` no max-width cap (LOW) — FIXED
**Viewports affected:** potential edge case at any narrow viewport with very long city names
**Symptom:** `.area-cities li` had no `max-width`, `overflow:hidden`, or `white-space`
constraint. A single pill with a 30-char city name ("Rancho Santa Margarita Springs")
would be allowed to grow to its natural width before wrapping. Stress test confirmed no
overflow in practice (flex-wrap catches it), but a single 40-char+ city name in a wide
font could exceed 360px.
**Fix in styles.css:**
- Added `max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap`
  to `.area-cities li`
**Verified:** 12 long-named city pills all within viewport at 360px ✓

### D5 — Add-on label + price `<b>` could squeeze at narrow widths (LOW) — FIXED
**Viewports affected:** potential edge case at 320px with very long add-on labels
**Symptom:** The `.ex span` flex row had no `flex-shrink` or `min-width:0` on the label
`<span>`, meaning the label would not shrink first when the price `<b>` needed space.
The `<b>` (price) had no `white-space:nowrap`, so it could wrap unexpectedly.
**Fix in styles.css:**
- Added `.ex span>span { flex:1 1 0; min-width:0; overflow:hidden; text-overflow:ellipsis }`
  — label shrinks first
- Added `white-space:nowrap; flex:none` to `.ex span b` — price stays on one line
**Verified:** 8 add-on rows with long labels + $9,999 prices fit within 360px ✓

---

## Items Confirmed as Non-Defects (false positives from element-bounds scan)

### Leaflet internal elements "overflowing" — NOT a real defect
**What the scanner found:** `leaflet-tile`, `leaflet-pane svg`, `leaflet-proxy` elements
with BoundingClientRect.right values exceeding innerWidth.
**Why it is not a real defect:** `document.documentElement.scrollWidth === innerWidth`
at all viewports — no actual horizontal scroll. The `#map` div has `overflow:hidden`
applied by the browser (confirmed via getComputedStyle), so the Leaflet-internal
canvas/tile elements are rendered inside the clipped region but their raw element
bounds reported by getBoundingClientRect extend beyond — this is normal Leaflet
behavior on tile maps. No user-visible overflow, no scrollbar.

### 404 console errors for placeholder images — NOT a JS error
The 9 console `[error]` messages per viewport are all image 404s (hero.jpg + gal-1
through gal-6). These are expected: the template ships without placeholder image files;
the `/images/` directory exists but is empty. No JavaScript error occurs. The page
functions correctly with D2's fix handling the missing-image state gracefully.

### Booking modal scroll at 360x520 (keyboard-simulated) — PASS
At 360x520 (simulated keyboard-raised viewport), the modal `overflow-y:auto` is already
set and the submit button is reachable via scroll (confirmed: after scroll, submitTop=350,
submitBottom=399, vh=520, visible=true). The `.modal` padding is `5vh 18px 24px`
which correctly keeps the card contained. No fix needed.

### Date input past-date blocking — PASS
`min` attribute is set to today's date by `applyDateLimits()`. Confirmed:
`min="2026-09-17"`, `pastBlocked=true`, selecting yesterday shows "That date has passed"
warning. No fix needed.

### Logo truncation at extreme name lengths — PASS
With "Rancho Santa Margarita Mobile Detailing Co Professional" as business name:
`scrollW=355 > clientW=206` at 360px (nav) — this is correct: the element IS constrained
with ellipsis applied, `scrollWidth` reports the full unclipped text length which is
expected behavior. No visual overflow. PASS.

---

## Deferred (Admin HTML defects — not in owned files)
None observed during public-site audit. Admin HTML was not tested per task rules.

---

## Screenshots
All screenshots saved to `_test/screens-public/`:
- `final-{viewport}-above-fold.png` — above the fold, 6 viewports
- `final-{viewport}-pricing.png` — quote tool, 6 viewports
- `final-{viewport}-map.png` — service area map, 6 viewports
- `final-{viewport}-footer.png` — footer, 6 viewports
- `verify-{viewport}.png` — post-fix verification, 5 viewports (incl. stress)
- `stress-360-*.png` — stress content snapshots
- `360-gallery-detail.png` — gallery broken-image state

---

## Re-run Instructions
```
# 1. Start server from template dir (choose any port != 8130)
cd C:\Users\carso\Projects\smb-websites\sites\_template
python -m http.server 8140

# 2. Run any of the audit scripts (temp dir, already installed)
cd C:\Users\carso\AppData\Local\Temp\pw-audit-smb
node verify.js      # quick pass/fail on all 5 checked items
node audit.js       # full element-scan across all 6 viewports
node final-screens.js  # capture full-page screenshots

# 3. For stress test at 360px:
node check5.js      # body overflow check with long business name
```
Note: node_modules in `C:\Users\carso\AppData\Local\Temp\pw-audit-smb\` should be
cleaned up when no longer needed (`Remove-Item -Recurse node_modules`).
