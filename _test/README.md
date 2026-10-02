# Admin mock harness (`sites/_template/_test/`)

Exercises `../admin.html` past its Firebase login screen with an in-memory
Firebase mock + seeded fixtures, and audits it at five viewports with a local
Chromium (playwright). Everything here is test-only; nothing ships to a client.

## Files
- `firebase-mock.js` — mock of the Firebase v10 modular SDK subset admin.html
  imports (app/auth/firestore). In-memory store; writes round-trip within a session.
- `fixtures.js` — the seeded content doc + ~25 bookings (all statuses, past/today/
  future, a same-day overlapping pair, long name/vehicle/note/email, a photos
  booking, repeat customers) + blocked days + a vacation range. Dates are relative
  to "today" so the fixture always spans past/present/future.
- `build-mock.mjs` — generates `admin-mock.html` **from** `../admin.html` by
  rewriting the three gstatic Firebase import URLs to `./firebase-mock.js`, inlining
  a CLIENT config (owner allowlist + siteId), and stubbing the EmailJS CDN. Re-run
  after editing admin.html so the harness tests current code, never a stale copy.
- `audit.mjs` — rebuilds the mock, serves `../` on a local port, drives 5 viewports
  x every screen, probes overflow / tap-targets / JS errors, screenshots to
  `screens/`, writes `audit-report.json`.
- `functional.mjs` — rebuilds the mock and runs 17 behavior tests (status flow,
  confirm-blocks-slot, double-booking guard, calendar day block toggle, upcoming
  confirm, filters, expand detail, customer history, saves round-trip).
- `capture-calendar.mjs`, `capture-extras.mjs` — focused screenshot/dialog captures.
- `serve.mjs` — standalone static server (root = `../`) if you want to open the mock
  in a real browser: `node serve.mjs` then visit `http://127.0.0.1:8799/`.

## Playwright resolution (no install)
Scripts resolve `playwright` from the npx cache automatically (it was already
primed). If resolution ever fails, prime it once with `npx playwright --version`.
No `node_modules` is created in or near the template.

## Run it
From `sites/_template/_test/`:

    node build-mock.mjs        # regenerate admin-mock.html from current admin.html
    node audit.mjs             # full 5-viewport visual audit -> screens/ + audit-report.json
    node functional.mjs        # 17 behavior tests (rebuilds first)
    node capture-calendar.mjs  # calendar day-detail + guard-dialog captures
    node capture-extras.mjs    # filters / expand / login / non-owner captures

`audit.mjs` and `functional.mjs` each rebuild the mock first, so a single
`node functional.mjs && node audit.mjs` retests the live admin.html end to end.

NOTE: `audit.mjs` wipes `screens/` at the start of each run. If you want the
focused `CAL_*/BK_*/LOGIN_*` captures kept alongside the audit grid, run the
`capture-*.mjs` scripts **after** `audit.mjs`, not before.

## Interpreting results
- `audit-report.json.summary` — headline counts. Target: 0 doc overflow, 0 element
  overflow, 0 JS errors, 0 small tap targets at touch widths (<=768).
- Remaining small-target hits at 1280 are desktop mouse targets (34px buttons,
  31px chips) — acceptable, see `DEFECTS_ADMIN.md` D-13.

See `DEFECTS_ADMIN.md` for the full found/fixed/deferred log.
