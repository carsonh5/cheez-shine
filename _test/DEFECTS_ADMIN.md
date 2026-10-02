# Admin dashboard — defect log & audit results

Target: `sites/_template/admin.html` (the only shared file this pass may edit).
Harness: `sites/_template/_test/` — local Chromium (playwright) driving a mock
Firebase, seeded fixtures, five viewports. Re-run instructions at the bottom.

Audit date: 2026-09-17. Viewports: 360x640, 390x844, 414x896, 768x1024, 1280x800.

## Final automated state (after fixes)
- Screens with horizontal document overflow: **0** (was 3)
- Per-element bounding-box overflows: **0** (was 360)
- Small tap targets at touch widths (<=768px): **0** (was ~200)
- JS/console errors across all screens & flows: **0**
- Functional behavior tests: **17/17 pass**

The ~160 "small tap target" hits that remain are exclusively at **1280x800
desktop** (mouse pointer): row action buttons at 34px, filter chips at 31px,
and the two calendar month-nav chevrons at 32px. These are appropriate mouse
click targets; the >=40px rule is a touch guideline and every touch width
(<=768) meets it. Not treated as defects — see D-13.

---

## FOUND + FIXED (admin.html — files I own)

### D-01 · Tablet-portrait layout blowout (768px) — SEVERITY: HIGH
- Viewport: 768x1024 · Screen: every screen (overview, bookings, customers, etc.)
- Defect: the mobile breakpoint stopped at `max-width:760px`, so 768px used the
  desktop `#app{grid-template-columns:230px 1fr}` layout. The 4-column booking
  rows + 230px sidebar overflowed the viewport by ~316px; action buttons and the
  "est. total" column were pushed off-screen (unreachable on a tablet in portrait).
- Fix: raised both breakpoints (`@media(max-width:600px)` row-stacking and
  `@media(max-width:760px)` mobile-shell) to **900px**, so tablet-portrait gets the
  single-column mobile layout that fits. 1280 stays desktop. Overflow now 0.

### D-02 · Native checkboxes are 13px tap targets — SEVERITY: MEDIUM
- Viewport: all (worst on mobile) · Screen: Availability (days-open toggles),
  Settings (section toggles, pay toggle)
- Defect: unstyled `<input type=checkbox>` render at ~13px — far below any tap
  target minimum; hard to hit on a phone.
- Fix: base rule bumps checkboxes to 20px everywhere; mobile `@media` bumps to
  26px with `accent-color`. Also converted the two Settings toggle rows from
  `<div class="togg">` to `<label class="togg">` so the whole 48px row is the tap
  target (Availability rows were already labels). Effective target is now the
  full row.

### D-03 · Icon buttons (delete/remove) 32px on mobile — SEVERITY: MEDIUM
- Viewport: mobile · Screen: Availability (remove slot / remove day-off / unblock)
- Defect: `.btn-icon` was 32x32; the mobile `.acts .btn{min-height:44px}` rule did
  not cover `.btn-icon` inside `.av-row`.
- Fix: mobile `.btn-icon{min-width:44px;min-height:44px}` with larger SVG.

### D-04 · No double-booking guard — SEVERITY: HIGH (STEP 3 requirement)
- Screen: Bookings + Availability upcoming
- Defect: confirming a booking that overlapped an already-confirmed booking's
  date+time silently double-booked with no warning.
- Fix: added `clashesFor(b)` + a shared `confirmBooking(id)` used by both the
  Bookings rows and the Availability upcoming/day-detail. On a clash it shows a
  `confirm()` listing BOTH bookings (this one + each clash) before proceeding.
  Verified: confirming Priya then Tom (same date+time) triggers the warning with
  both shown. Overlap is also surfaced inline (amber "overlaps a confirmed
  booking" on the row, and "overlaps N confirmed" in the upcoming list).

### D-05 · Calendar day detail had no block toggle — SEVERITY: HIGH (STEP 3)
- Screen: Availability calendar
- Defect: tapping a day only listed its bookings; no way to block/unblock from the
  day view (STEP 3 wants "tap day -> day detail (bookings + block toggle)").
- Fix: day detail now renders a `cal-day-box` with the date, a **Block whole day /
  Unblock this day** button, per-booking rows with status chips and one-tap
  Confirm. Blocking a day that already has bookings warns and lists them. Vacation
  days show a hint pointing to the vacation editor instead of a raw unblock.

### D-06 · Blocked days not visually distinct in calendar — SEVERITY: MEDIUM (STEP 3)
- Screen: Availability calendar
- Defect: blocked days / days-off looked identical to open days.
- Fix: `calendarHtml()` now marks whole-day blocks & vacations with a red hatched
  `cal-blocked` cell, days with a blocked slot get a "blk" marker, closed weekdays
  get a muted `cal-off` style, plus a legend (bookings / blocked / today) under the
  grid. Cancelled/done bookings no longer inflate the day badge count.

### D-07 · Upcoming list capped at 3, no confirm — SEVERITY: MEDIUM (STEP 3)
- Screen: Availability upcoming
- Defect: showed only 3 upcoming with no action (STEP 3 wants 5+ with one-tap
  Confirm and status chips).
- Fix: upcoming now shows up to 8, excludes cancelled/done, shows a status chip and
  a one-tap **Confirm** on new bookings (routed through the double-booking guard),
  and flags overlaps.

### D-08 · No full status flow (couldn't cancel or reopen) — SEVERITY: MEDIUM
- Screen: Bookings, Overview recent
- Defect: rows only offered Confirm (new) and Done; no way to Cancel, and no way to
  reopen a done/cancelled booking. `cancelled` had no badge style.
- Fix: full flow — new -> Confirm/Done/Cancel; confirmed -> Done/Cancel;
  done/cancelled -> Reopen. Added `.b-cancelled` badge style. Cancel/reopen
  round-trip to the store.

### D-09 · No booking filters — SEVERITY: MEDIUM (STEP 2 "all filters")
- Screen: Bookings
- Defect: flat unfiltered list; on a busy account you cannot isolate new requests.
- Fix: added a filter chip bar (All / New / Confirmed / Done / Cancelled) with live
  counts; chips filter the list and show an empty-state per filter.

### D-10 · No booking detail / expand — SEVERITY: LOW (STEP 2 "expand detail")
- Screen: Bookings
- Defect: address, add-ons and any attached photos were never shown in admin.
- Fix: each row is tappable to expand a detail panel (Where / Add-ons / Vehicle /
  Estimate / Email / Notes + photo thumbnails when `booking.photos[]` exists).
  A caret indicates expandability.

### D-11 · Customers had no visit history — SEVERITY: LOW (STEP 2 "expand history")
- Screen: Customers
- Defect: showed totals only; "last visit" used `visits[0]` (creation order, not
  most-recent date), so it could show a stale date.
- Fix: customer rows expand to a dated visit history (sorted most-recent first,
  with package/vehicle/estimate/status per visit); "last visit" now uses the true
  most-recent date; added a one-tap Text button per customer.

### D-12 · Overview stats counted cancelled bookings — SEVERITY: LOW
- Screen: Overview
- Defect: "Total bookings" and "Est. pipeline" summed ALL bookings including
  cancelled, overstating pipeline.
- Fix: "Active bookings" excludes cancelled; "Est. pipeline" sums only new +
  confirmed (money still in play). Relabeled "New bookings" -> "New requests".

### D-13 · Defensive: expand handler could throw on a null event target — SEVERITY: LOW
- Fix: guarded `e.target && e.target.closest && ...` in the two expand handlers so
  a synthetic event (or unusual target) can never throw.

---

## RESOLVED IN WAVE 2 (S-01, S-02)

### S-01 · availability defaults deduplicated · RESOLVED 2026-09-17
- **Root:** admin.html `availState()` hardcoded the default slot list
  `["Morning (9–12)","Midday (12–3)","Afternoon (3–7)"]` independently from the
  identical list in `content.js` `DEFAULT_CONTENT.availability.slots`. A drift
  between the two would cause a brand-new site (no saved availability doc) to show
  different defaults in the public time-slot picker vs. the admin editor.
- **Fix:**
  1. Added `<script src="./content.js"></script>` to admin.html (before its module
     script) so `window.DEFAULT_CONTENT` is available to the admin at load time.
  2. Updated `availState()` to read slot/openDay/vacation/blocked/leadDays/horizonDays
     defaults from `window.DEFAULT_CONTENT.availability` first, falling back to the
     existing literals only if the content field is absent. Single source of truth.
  3. Updated `_test/build-mock.mjs` to rewrite `<script src="./content.js">` to
     `<script src="../content.js">` in the generated mock (admin-mock.html lives in
     `_test/`, so a relative `./` would resolve to the wrong path).
- **Regression:** 17/17 functional, 0 JS errors, 0 overflows. Mock rebuild clean.

### S-02 · booking photo attach wired end-to-end · RESOLVED 2026-09-17
- **Root:** `#bkPhotos` file input collected files but never added them to the booking
  payload; `submitBooking` received no `photos` field and nothing was persisted.
- **Fix (index.html):**
  - Replaced the simple file-count display with a full compress-and-attach flow:
    client-side compression via canvas (max edge 800px, quality 0.7), recompress
    at lower quality steps to ~0.3 if needed; per-photo hard cap 250 KB after
    compression (skip + notify if still over); max 3 photos enforced with a clear
    "Max 3 photos — extra skipped." notice; total booking doc size guard at 900 KB
    (blocks adding more if it would push the estimated doc over Firestore's 1 MB
    ceiling).
  - Added thumbnail row (`#bkThumbRow`) with per-photo remove buttons and photo-count
    label updates on every add/remove.
  - Added `photos: [dataUrls]` to the booking payload on submit (only when photos are
    attached); `submitBooking` passes them through to Firestore unchanged (data URLs,
    same storage pattern as gallery/hero photos).
  - On the done screen: when photos were attached, shows "Your photo/photos were
    attached to your request. If you text to confirm instead, photos will be
    requested by text." — explicit SMS-path notice so the user knows photos don't
    ride along in the SMS body.
  - `window.__CR_clearBookingPhotos()` called after a successful submit so a modal
    re-open starts clean.
- **Numbers:** max 3 photos, per-photo cap 250 KB compressed, doc guard 900 KB.
- **Regression:** 39/39 public site checks across 360x640, 390x844, 1280x800:
  quote flow, booking modal, thumbnails, remove button, over-limit block, SMS-path
  notice, gallery placeholder, map, zero console errors. Admin: 17/17, 0 overflows.

---

## FOUND + DEFERRED (shared files — NOT edited; for the orchestrator)

### S-03 · firestore.rules — bookings are owner-read-only; admin `getDocs` is fine · SEVERITY: INFO
- File: `sites/_template/firestore.rules` lines 52-55.
- Detail: not a defect — noting that the admin's booking list relies on
  `read: if isOwner()`, which is satisfied for a signed-in owner. The public
  track/my-bookings paths are intentionally disabled (documented in the rules).
  No change needed for the admin; recorded for completeness.

---

## Genuinely unverifiable without a live Firebase project
- Real Google sign-in popup (`signInWithPopup`) and the owner-gate against a real
  `owners/{uid}` doc — the mock resolves an owner directly. The client-side
  `OWNERS.includes(email)` gate IS exercised (verified the non-owner rejection
  path shows the correct message and bounces to login).
- `sendPasswordResetEmail` actually dispatching mail.
- Real EmailJS delivery (promos, review requests) — mocked with a recording stub;
  the admin's send calls, parameters, and success/failure UI are exercised, but no
  mail is sent.
- Firestore security-rule enforcement on writes (the mock always allows the owner).
- The 1 MB content-doc storage ceiling under real photo data URLs (the storage
  meter math is exercised with fixture-sized content only).
