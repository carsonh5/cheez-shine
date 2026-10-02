# New Client Provisioning Checklist

The complete runbook for spinning up a new SMB site from `sites/_template/`.
Target: **under 1 hour**. Steps are numbered; time estimates in brackets.

The engine (`app.js`, `index.html`, `admin.html`, `styles.css`) is never edited.
You touch exactly three things per client: **`client.config.js`**, **`content.js`**,
and the **photos** in `images/`. Everything else is Firebase console + git.

Prereqs (one-time on your machine):
- `npm i -g firebase-tools` then `firebase login`
- `gh auth login` (GitHub CLI)
- Python 3 (for the scaffold tool + local test server) — already on this machine

---

## 0. Scaffold the site  [2 min]
Use the scaffold tool — it copies the template, fills everything derivable
(`siteId`, `accent`, `phoneRaw`, the business name across `client.config.js`,
`content.js`, and the `index.html` `<head>` SEO/OG/JSON-LD/canonical), refuses to
overwrite an existing folder, and prints the exact REPLACE_ME TODO list:
```bash
# from smb-websites/_build/
python new_client.py <client-site-id> "<Business Name>" \
  --accent "#2563EB" --phone "(555) 555-0100" --gh-user carsonh5
```
Use a lowercase-hyphenated id (e.g. `broskis-auto-detail`). This id becomes the
Firebase project id, the GitHub repo name, AND `CLIENT.siteId` — keep all three
identical. `--accent`/`--phone` are optional (defaults: neutral blue, a 555
placeholder) but pass them if you have them — they save a manual edit each.

> Manual alternative (if you prefer): `cp -r _template <client-site-id>`, then do
> steps 7–8 by hand. The scaffold tool just front-loads the mechanical fills.

> NOTE: you no longer hand-sweep the HTML `<head>`/`<title>`/logo/brand strings.
> The scaffold fills the static pre-hydration copy, and at runtime `app.js`
> re-syncs `<title>`, meta description, Open Graph/Twitter, the JSON-LD business
> block, the accent (and a derived hover shade), and the admin dashboard title +
> brand from the live content doc. Editing `content.js` (or the live admin) is
> enough — there are no stray per-client strings left in the engine HTML.

---

## 1. Create the Firebase project  [5 min]
Console: https://console.firebase.google.com → **Add project** → name it
`<client-site-id>` → disable Google Analytics (not needed) → Create.

CLI equivalent (optional, needs the right Google account):
```bash
firebase projects:create <client-site-id> --display-name "<Client Name>"
```

Then register a **Web app**: Project Overview → the `</>` (Web) icon → nickname
`<client-site-id>` → **Register app**. Copy the `firebaseConfig` object it shows.

---

## 2. Enable Email/Password auth  [1 min]
Console → **Build → Authentication → Get started** → Sign-in method →
**Email/Password → Enable → Save**.
(Optional: also enable **Google** if you want the client to sign in with Google
and to keep the customer "My bookings" feature. The admin login supports both.)

---

## 3. Create Firestore  [1 min]
Console → **Build → Firestore Database → Create database** →
**Start in production mode** (rules get deployed in step 6) → pick the closest
region → Enable.

---

## 4. Add owner users + owners/{uid} docs  [6 min]
This is the security gate. The client-agnostic `firestore.rules` grant owner
writes to any signed-in user that has a doc at `/owners/{their uid}`.

**4a. Create the Auth user(s).**
Console → Authentication → Users → **Add user** → enter the client's email +
a temporary password (they reset it later via the "forgot password" link on the
admin page). Add your own admin email too. Copy each user's **User UID**.

**4b. Create the matching owners doc(s).**
Console → Firestore → **Start collection** → Collection ID `owners` →
Document ID = **paste the User UID** → add one field `email` (string) = that
user's email (the field is just for your reference; the rule only checks the
doc's existence) → Save. Repeat for every owner UID.

> No SQL involved — Firestore is document-based. The rule only needs the doc to
> EXIST at `/owners/{uid}`; contents are optional.

CLI alternative for 4b (after `firebase login`), one file then import — or just
do it in the console (faster for 1–2 owners). Console is the recommended path.

**4c. Keep `CLIENT.owners` in sync.** Every email that has an owners/{uid} doc
must also appear in `client.config.js` `owners: [...]` (that array is the
client-side UI gate; the owners/{uid} doc is the real server gate).

---

## 5. Deploy the security rules  [2 min]
The repo ships `firebase.json` + `firestore.rules` + `storage.rules`.
```bash
firebase use <client-site-id>          # or: firebase deploy --project <client-site-id>
firebase deploy --only firestore:rules
# Storage rules are deny-all and optional (engine doesn't use Storage). Deploy only
# if you enabled Storage on the project:
# firebase deploy --only storage
```
Rules are identical for every client — never edit them.

---

## 5b. DECISION: customer "track my booking" reads  [1 min — decide per client]
`firestore.rules` ships with a **safe strict default**: bookings are
`create: if true` (anyone can request a booking) but `read/update/delete:
if isOwner()`. That default **disables** the two customer-facing read paths:
- the `?track=<id>` "Track your booking" link shown after a customer books, and
- the "My bookings" Google sign-in drawer in the footer.

The booking still saves, the owner still sees it in admin, and the customer still
gets the SMS/confirmation — only the customer's own later *lookup* is blocked.
This is the default because a booking doc holds a name/phone/address, and a
"read any booking by id" rule leaks that PII to anyone who guesses an id.

**Pick one and (if not the default) edit the `bookings` match block in
`firestore.rules`, then re-run step 5's `firebase deploy --only firestore:rules`:**

- **Option A — Strict (default, recommended).** Leave the rule as shipped:
  ```
  match /bookings/{bookingId} {
    allow create: if true;
    allow read, update, delete: if isOwner();
  }
  ```
  Track-by-link and My-bookings are OFF. No action needed.

- **Option B — Capability-link (track-by-id only).** Anyone with the exact
  unguessable doc id can read that ONE booking (no listing/enumeration):
  ```
  match /bookings/{bookingId} {
    allow create: if true;
    allow get: if true;                 // single-doc read by exact id
    allow list: if isOwner();           // no enumeration for the public
    allow update, delete: if isOwner();
  }
  ```
  Enables `?track=<id>`. "My bookings" still needs Option C's clause. Weaker:
  the link holder sees that booking's PII.

- **Option C — Signed-in customer read (adds "My bookings").** Also enable
  Google sign-in in step 2:
  ```
  match /bookings/{bookingId} {
    allow create: if true;
    allow read: if isOwner()
      || (request.auth != null && resource.data.email == request.auth.token.email);
    allow update, delete: if isOwner();
  }
  ```
  A signed-in customer reads only bookings whose `email` matches their account.
  (Combine with Option B's `allow get: if true;` if you also want track-by-link.)

Leave it on Option A unless the client specifically asks for customer self-service.

---

## 6. Add the authorized domain  [1 min]
So Auth works on the live GitHub Pages URL.
Console → Authentication → **Settings → Authorized domains → Add domain** →
`<github-username>.github.io` (and any custom domain you'll connect later).
`localhost` is authorized by default, so local testing already works.

---

## 7. Finish client.config.js  [4 min]
The scaffold (step 0) already set `siteId`, `accent`, and `phoneRaw` (if you
passed `--phone`). Open `client.config.js` and replace what's LEFT:
- `firebase` — paste the web config object from step 1 (all still `REPLACE_ME`)
- `owners` — replace `REPLACE_ME-owner@example.com` with the client's email;
  keep your admin email (must match step 4)
- `map.center` / `map.radius` / `map.cities` — service-area lat/lng, ring radius
  in meters, and `["City", lat, lng]` pins. **The scaffold leaves the example
  Denver coordinates and `REPLACE_ME City A/B/C` — these MUST be replaced.** If
  you set `center` to `null`, the map section simply doesn't render.
- `phoneRaw` — only if you didn't pass `--phone` (still the `+15555550100`
  placeholder). `+1` + 10 digits (E.164), matching the business phone.

---

## 8. Fill content.js + drop photos  [15 min]
Open `content.js` (the `window.DEFAULT_CONTENT` object) and edit the copy,
prices, packages, add-ons, story, hours, social, and SEO for this client.
The scaffold set `business.name`, `brand.accent`, `story.cite`, `seo.*`, and
(if `--phone`) `business.phone`. Still to author:
- `hero.*`, `area.lead` + `area.cities`, `story.quote`, `hours`
- `packages` / `vehicles` / `addons` prices + labels (re-price for this client)
- `business.email`, `social.*`
- **`booking.notifyEmail`** — set to the CLIENT'S email (placeholder is
  `owner@example.com`). This is where booking-request emails land.
- **`booking.emailjs`** — paste the CLIENT'S OWN EmailJS `serviceId` /
  `templateId` / `publicKey`, or leave all three blank. **Never reuse another
  client's EmailJS keys.** Blank = bookings still save to Firestore and show in
  admin; only the email alert is skipped (surfaced as "Off" in admin Settings).
- `reviews` — real reviews once available (the placeholder is generic).

Confirm `brand.accent` matches `CLIENT.accent` (the scaffold keeps them in sync).
(For a different niche, start from the matching pack in `NICHE_PACKS.md` and see
its note on renaming the "Your vehicle" HTML label.)

**Photos** — drop into `images/` with these exact names (the content defaults
point at them):
- `hero.jpg` — the big hero background
- `gal-1.jpg` … `gal-6.jpg` — the gallery grid

Compress before committing (aim < 400 KB each). The owner can replace any photo
later from the admin (it re-compresses and stores as a data URL in the content
doc, so these files are only the initial gallery).

> Photo pipeline: pull from the client's Yelp/Nextdoor/Google CDN, rename to the
> convention above. Owner replacements after launch happen in-app, not here.

---

## 9. Verify locally  [3 min]
```bash
# from inside the client-site folder
python -m http.server 8080
```
Open http://localhost:8080/index.html and http://localhost:8080/admin.html.
- Public page renders, quote builder updates, map shows the ring + city pins.
- Firestore connection errors before the project is fully live are OK.
- **Before Firebase is live (or if offline), the page waits up to ~6 seconds,
  then paints from `DEFAULT_CONTENT`** (a hardened fallback in `app.js` `load()`
  so a pending Firestore read can't leave the page blank forever). A ~6s delay to
  first paint on a not-yet-live project is EXPECTED locally; once the project is
  live the read returns in <1s and there's no delay.
- **Undefined-variable / config errors are NOT OK** — check `client.config.js`
  loaded before `app.js` and has no leftover `REPLACE_ME` that breaks JSON.
- Sign in on `admin.html` with an owner account → first sign-in auto-seeds the
  content doc (no manual "save once"). Confirm the dashboard loads and shows the
  client's business name in the title + sidebar (pulled from the content doc).

---

## 10. Create the GitHub repo + push  [4 min]
```bash
# from inside the client-site folder (it is NOT yet a git repo)
git init -b main
git add .
git commit -m "Initial site for <Client Name>"
gh repo create <github-username>/<client-site-id> --public --source=. --remote=origin --push
```

---

## 11. Enable GitHub Pages  [2 min]
```bash
gh api -X POST repos/<github-username>/<client-site-id>/pages \
  -f source[branch]=main -f source[path]=/
```
(Or Console: repo → Settings → Pages → Source: `main` / `/ (root)` → Save.)
Live URL: `https://<github-username>.github.io/<client-site-id>/`

---

## 12. Verify the deploy actually shipped  [2 min]  ⚠️ KNOWN GOTCHA
GitHub Pages sometimes serves a **stale build** — the Pages build lags or
doesn't fire on the first push. After pushing, confirm the deployed commit
matches HEAD:
```bash
gh api repos/<github-username>/<client-site-id>/pages/builds/latest \
  --jq '.commit'                    # must equal:
git rev-parse HEAD
```
If they DON'T match (or the build is stale/errored), force a rebuild:
```bash
gh api -X POST repos/<github-username>/<client-site-id>/pages/builds
```
Wait ~30–60s and re-check `pages/builds/latest`. Repeat until `.commit` == HEAD
and `.status` == `built`.

---

## 13. Final verify on the live URL  [3 min]
- Load the live site; hard-refresh (Ctrl+Shift+R) to dodge CDN cache.
- Submit a test booking → confirm it lands in admin **Bookings** (and the
  notify email arrives if EmailJS is configured in `content.js`).
- Sign in to `admin.html` on the live domain (this exercises the authorized
  domain from step 6).
- Delete the test booking.

Done. Hand the client their admin URL + login and the "forgot password" link to
set their own password.

---

## Appendix: the seed / "save once" step is automated
There is **no manual seed step**. On the first visit by a signed-in owner, the
engine (`app.js` → `maybeSeed()`) checks whether `/sites/{siteId}` exists and,
if not, writes `window.DEFAULT_CONTENT` to it. It is guarded to owners (the
Firestore rules only allow the write from an owners/{uid} user) and runs at most
once. If you ever need to force a re-seed to defaults, an owner can run
`window.__CR_seed()` from the browser console on the public page.

## Appendix: quick reference — what changes per client
| File | What to edit |
|------|--------------|
| `client.config.js` | siteId, owners, firebase, accent, map, phoneRaw |
| `content.js` | all copy/prices/packages/story/hours/social/SEO + `booking.notifyEmail` + `booking.emailjs` |
| `images/` | hero.jpg + gal-1..6.jpg |
| `firestore.rules` | ONLY if you chose Option B/C in step 5b (booking reads). Default = untouched. |
| Firebase console | project, auth, firestore, owner users + owners/{uid} docs, authorized domain |
| (never) `app.js`, `index.html`, `admin.html`, `styles.css`, `firebase.json` | engine + infra — reuse verbatim |

> **Deploy note:** BOTH pages depend on `client.config.js` + `content.js` —
> `admin.html` loads `content.js` too (availability defaults). Every deploy must
> ship all engine files AND both config/content files together; omitting
> `content.js` breaks the admin, not just the public site. The `owners` array
> ships as two REPLACE_ME placeholders — set the client's email AND your own
> admin email there (step 7), or the admin will lock everyone out.

## Appendix: HTML placeholder strings — handled for you (no manual sweep)
Older versions of this template needed a manual find-replace of the business
name across the HTML `<head>`/`<title>`/logo/brand. **That is no longer needed:**
- `new_client.py` (step 0) fills the static pre-hydration copy in `index.html`
  `<head>` (title, description, canonical, Open Graph/Twitter, JSON-LD name +
  phone + URL) from the inputs.
- At runtime `app.js` `syncSeo()` re-syncs `<title>`, meta description, OG/Twitter
  titles+descriptions, and the JSON-LD block (name, phone, description,
  `areaServed` from `area.cities`, `makesOffer` from `packages`) from the LIVE
  content doc, so any later edit in `content.js` or the admin propagates.
- `app.js` also drives the accent (`--accent`) **and a derived hover shade
  (`--accent-deep`)** from `content.brand.accent`, so buttons/hover follow the
  client's color — no CSS edit.
- `admin.html` sets its `<title>`, login heading and sidebar brand from the
  content doc's `business.name` at load (`applyBrand()`), and follows the accent.
- Customer-facing SMS / review-email text already reads `business.name` from the
  content doc.

The only place a business name literally lives per client is `content.js`
`business.name` (+ optional `business.nameSub` tagline). Everything else derives
from it. If you ever add a NEW hardcoded string to the engine HTML, wire it to a
`data-field` / content lookup instead of hardcoding it, to preserve this property.
