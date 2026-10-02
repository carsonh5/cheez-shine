# Niche Packs — the quote model is data, not code

The instant-quote tool is driven entirely by data in `content.js`
(`window.DEFAULT_CONTENT`). The engine (`app.js` + the quote script at the
bottom of `index.html`) renders whatever these fields contain, so switching
niches (detailer → pressure-washing → landscaper → groomer) is a **data edit**,
never a code change. Build a pack once per niche, reuse it across every client in
that niche.

---

## 1. The quote-model data shape (as found in the code)

A niche pack is these fields inside `DEFAULT_CONTENT`:

### `packages` — the tiers (radio group, pick one)
```js
packages: [
  { id: "basic", name: "Basic Interior", price: 60, list: ["...", "..."] },
  { id: "gold",  name: "Full Detail", price: 160, featured: true, tag: "Most chosen", list: [...] },
  { id: "platinum", name: "Buff & Ceramic", price: 290, tag: "Best protection", list: [...] }
]
```
- `id` (string, unique) — internal key; also used by `included` below.
- `name` (string) — tier name shown to the customer.
- `price` (number) — the **base** price (dollars); the est. = base + vehicle add + paid add-ons.
- `list` (string[]) — bullet features shown in the tier card.
- `featured` (bool, optional) — highlights the tier (accent stripe).
- `tag` (string, optional) — small badge, e.g. "Most chosen".
- `desc` (string, optional) — present in data, not currently rendered.

### `vehicles` — the size/tier surcharge axis (radio group, pick one)
```js
vehicles: [
  { id: "sedan", label: "Sedan", add: 0 },
  { id: "suv",   label: "SUV",   add: 30 },
  { id: "truck", label: "Truck", add: 50 },
  { id: "xl",    label: "Oversized", add: 70 }
]
```
- `id` (string) — internal key.
- `label` (string) — shown in the segmented control.
- `add` (number) — dollars **added** to the package base. First entry is
  checked by default; `add: 0` shows no "+$" chip.

This is the generic **"size surcharge"** axis. For a detailer it's vehicle size;
for pressure-washing it's surface area; for a groomer it's dog size. The engine
doesn't care what it's called — it just adds `add` to the total.

### `addons` — optional extras (checkboxes, pick any)
```js
addons: [
  { id: "pethair", label: "Pet hair removal", add: 40 },
  { id: "engine",  label: "Engine bay cleaning", add: 50 }
]
```
- `id` (string) — internal key; referenced by `included`.
- `label` (string) — shown next to the checkbox.
- `add` (number) — dollars added when checked (and not "included").

### `included` — which add-ons come free with which package
```js
included: { basic: [], gold: [], platinum: ["engine"] }
```
- Keyed by **package `id`** → array of **addon `id`s** bundled into that tier.
- The engine auto-checks + disables those add-ons and shows "Included" instead of
  the price when that package is selected (so they don't double-charge).

### Section labels + copy (the "sectionLabels" the spec refers to)
There isn't a single `sectionLabels` object; the niche wording lives in these
content fields, which the engine hydrates into fixed DOM slots:
- `pricingLead` — the paragraph under "Instant pricing".
- `workHeading` — the gallery section heading.
- `hero.headline` / `hero.em` / `hero.sub` / `hero.mark` — hero copy.
- `area.lead` + `area.cities` — service-area copy + chips.
- `story.*`, `hours`, `social.*`, `seo.*` — the rest.
- The static section eyebrows/labels ("Pricing", "The work, up close", "Your
  vehicle", "Add-ons", "Service area", etc.) are **hardcoded in `index.html`**.
  For a niche where "Your vehicle" is wrong (e.g. pressure-washing), edit those
  labels in the client's `index.html` copy of the template — that's a per-niche
  HTML text tweak, still no engine logic change.

### How the total is computed (from `index.html` `getQuote()`)
```
estimate = package.price  +  selected vehicle.add  +  Σ (checked, non-included addon.add)
```
Boats/RVs/oversized jobs are handled as copy ("add a photo, we confirm price"),
not a separate code path.

---

## 2. Sketch: a pressure-washing pack (data-only)

Same four fields, re-authored. The `vehicles` axis becomes a **surface-area**
axis (rename the section label "Your vehicle" → "Home / surface size" in the
client's `index.html`). No code changes.

```js
// packages — service tiers
packages: [
  { id: "driveway", name: "Driveway & Walkways", price: 120,
    list: ["Concrete driveway", "Front walkway", "Spot-treat oil stains", "Rinse & sweep"] },
  { id: "house",   name: "House Soft-Wash", price: 260, featured: true, tag: "Most booked",
    list: ["Full siding soft-wash", "Eaves & soffits", "Gutter faces", "Windows rinsed"] },
  { id: "full",    name: "Whole Property", price: 480, tag: "Best value",
    list: ["Everything in House Soft-Wash", "Driveway + walkways", "Fence or deck", "Patio & steps"] }
],

// vehicles -> reused as the SURFACE-AREA / home-size surcharge axis
vehicles: [
  { id: "small",  label: "Up to 1,500 sqft", add: 0 },
  { id: "mid",    label: "1,500–2,500 sqft", add: 60 },
  { id: "large",  label: "2,500–4,000 sqft", add: 140 },
  { id: "xl",     label: "4,000+ sqft",      add: 240 }
],

// addons — optional extras
addons: [
  { id: "roof",     label: "Roof soft-wash",        add: 180 },
  { id: "deck",     label: "Deck / fence wash",     add: 120 },
  { id: "gutters",  label: "Gutter clean-out",      add: 90 },
  { id: "sealant",  label: "Concrete sealant",      add: 150 },
  { id: "rust",     label: "Rust / hard-water removal", add: 70 }
],

// included — bundle extras into higher tiers
included: { driveway: [], house: ["gutters"], full: ["gutters", "deck"] },

// niche copy
pricingLead: "Pick a service, choose your home size, add any extras — your price updates live. Final number confirmed after a couple of photos.",
workHeading: "Your property could look like this.",
```

Notes for this pack:
- Rename the `index.html` label `Your vehicle` → `Home size` (and the hero/est
  fine print that says "boat, RV or motorcycle").
- `map.cities` + `area.cities` become the service towns; same mechanism.
- Everything else (booking, availability, CRM, promos, admin) is niche-agnostic
  and works unchanged.

---

## 3. Other niches (one-liners)
- **Landscaper / lawn care**: `vehicles` → "yard size" (up to 1/4 acre, 1/2, 1
  acre, +). packages = mow/trim/cleanup tiers; addons = leaf haul, edging,
  mulch, aeration.
- **Dog groomer**: `vehicles` → "dog size" (S/M/L/XL). packages = bath / full
  groom / spa; addons = de-shed, nail trim, teeth, de-matting.
- **House cleaning**: `vehicles` → "home size / bedrooms". packages = standard /
  deep / move-out; addons = fridge, oven, windows, laundry.

---

## 4. Known upgrades to bake into a future pack (from REUSABLE_TEMPLATE_PARAMS.md)
- **Photos in a Storage-backed subcollection** instead of the 1 MB content doc,
  so galleries grow unbounded (replace `storage.rules` deny-all when you do).
- **EmailJS keys** are already a per-client content field
  (`booking.emailjs.{serviceId,templateId,publicKey}`) — set once per client.
- **Custom-claim auth** as an alternative to the owners/{uid} doc gate (the rules
  file notes both patterns).
- **Track-link + CRM + promos** — already generic; keep as-is.
