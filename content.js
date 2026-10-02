/* ============================================================
   DEFAULT CONTENT — Cheez Shine Mobile Detail (Memphis / West Memphis)
   ------------------------------------------------------------
   This is BOTH the fallback (shown before/if Firestore is
   unreachable) AND the seed (auto-written to the content doc on
   first load by a signed-in owner — see app.js maybeSeed()).
   Every editable value on the page lives here. Repeatable lists
   (packages, addons, gallery, reviews, cities) are arrays.

   Loaded as a plain <script> BEFORE app.js's module, so app.js
   reads window.DEFAULT_CONTENT.

   ------------------------------------------------------------
   SOURCE OF TRUTH FOR THE DEMO (verified Oct 2026, primary sources):
     - Google Business Profile knowledge panel: name, "Car detailing
       service", address 324 N 5th St West Memphis AR 72301, phone
       (559) 260-8749, hours Mon–Sat 7a–7p / Sun closed, 5.0 rating
       (12 Google reviews), tagline "GET YO SHINE ON!!", services
       (mobile detailing all vehicles + pressure washing).
     - Facebook (@61573396979642, 210+ followers): business email on
       file locally; all 6 vehicle photos in images/ are their real
       customer work pulled from this page.
     - 3 review quotes below are verbatim from Google reviews.
   NO owned website found (GBP shows "Add website").

   >>> PRICES BELOW ARE DRAFT — Memphis-market rates, NOT the owner's
       published prices (he lists none publicly). CONFIRM every price,
       the service-area city list, and the owner's first name with him
       on the call BEFORE launch. <<<
   ============================================================ */
window.DEFAULT_CONTENT = {
  business: {
    name: "Cheez Shine Mobile Detail",
    nameSub: "",
    phone: "(559) 260-8749",
    email: "",   // owner's booking-alert email goes here at launch (have it on file; confirm with him on the call before wiring)
    license: "",
    owner: "Owner"
  },
  hero: {
    headline: "Get yo",
    em: "Shine on",
    sub: "Mobile detailing for cars, trucks and SUVs — plus pressure washing for homes, rigs and lots. We bring the shop to you across the Memphis area.",
    mark: "Mobile detailing  ·  Pressure washing  ·  We come to you",
    photo: "./images/hero.jpg",
    photoPosX: 55, photoPosY: 55, photoZoom: 100
  },
  brand: { accent: "#E8A33D" },   // keep in sync with CLIENT.accent in client.config.js
  pricingLead: "Pick a package, add your vehicle and any extras, and your price updates as you go — no waiting on a callback. We text you to confirm the time and final price before we start.",
  // DRAFT PRICING — Memphis-market rates for a mobile detailer. Confirm with owner before launch.
  packages: [
    { id: "basic", name: "Maintenance Wash", price: 75, desc: "", list: ["Exterior hand wash & dry", "Wheels & tires cleaned and dressed", "Windows in & out", "Quick interior vacuum & wipe-down"] },
    { id: "gold", name: "Full Detail", price: 185, featured: true, tag: "Most chosen", list: ["Exterior hand wash & decontamination", "Full interior deep clean & vacuum", "Shampoo or steam, leather conditioned", "Hand wax & tire shine"] },
    { id: "platinum", name: "Buff & Ceramic", price: 325, tag: "Best protection", desc: "", list: ["Everything in Full Detail", "Paint correction buff", "Engine bay cleaning", "Ceramic sealant & long-lasting shine"] }
  ],
  vehicles: [
    { id: "sedan", label: "Car / Sedan", add: 0 },
    { id: "suv", label: "SUV / Crossover", add: 30 },
    { id: "truck", label: "Truck", add: 45 },
    { id: "xl", label: "Oversized / Lifted", add: 70 }
  ],
  addons: [
    { id: "pethair", label: "Pet hair removal", add: 40 },
    { id: "stains", label: "Shampoo & stain extraction", add: 50 },
    { id: "protect", label: "Fabric & leather protection", add: 45 },
    { id: "pressure", label: "Add-on pressure washing (driveway / home)", add: 75 }
  ],
  included: { basic: [], gold: [], platinum: [] },
  workHeading: "Real work. Real shine.",
  gallery: [
    { src: "./images/gal-1.jpg", cap: "Range Rover Sport — full exterior detail, done on-site" },
    { src: "./images/gal-2.jpg", cap: "Lifted Ram 2500 — wash, decon & tire dressing" },
    { src: "./images/gal-3.jpg", cap: "Range Rover Sport — hand wash & paint gloss" },
    { src: "./images/gal-4.jpg", cap: "Mercedes G-Wagon — exterior detail" },
    { src: "./images/gal-5.jpg", cap: "Range Rover — front-end detail & trim" },
    { src: "./images/gal-6.jpg", cap: "C8 Corvette — exterior detail & wheels" }
  ],
  story: {
    over: "From Cheez Shine",
    quote: "We do it all — cars, trucks, SUVs, and pressure washing for homes, tractors, big rigs and lots. No job's too big. We bring the detail shop to your driveway and leave every ride looking like it just rolled off the lot. Get yo shine on.",
    cite: "Cheez Shine Mobile Detail"
  },
  reviews: [
    { name: "Google review", text: "Great service, friendly staff, clean van for reasonable price.", source: "Google" },
    { name: "Google review", text: "Prices are very reasonable and the quality is top notch.", source: "Google" },
    { name: "Google review", text: "Marcus and his crew always take care of me and does an excellent job every time.", source: "Google" }
  ],
  area: {
    lead: "Based in West Memphis and fully mobile across the greater Memphis area. Your driveway, your office lot, wherever the vehicle sits. Just outside the ring? Call us — we often still make it work.",
    // Service cities — DRAFT list; confirm his actual coverage on the call.
    cities: ["Memphis", "West Memphis", "Germantown", "Bartlett", "Cordova", "Southaven"]
  },
  hours: "Mon–Sat 7:00a–7:00p · Sun closed.",
  social: { ig: "", fb: "https://www.facebook.com/61573396979642", yelp: "", nextdoor: "", igFeedOn: false },
  booking: { notifyEmail: "", photoUploadOn: true, payLink: "", payLabel: "Pay a deposit to lock your spot", payOn: false, reviewLink: "", emailjs: { serviceId: "", templateId: "", publicKey: "" } },
  availability: {
    slotMode: "windows",
    slots: ["Morning (7–11)", "Midday (11–3)", "Afternoon (3–7)"],
    openDays: [false, true, true, true, true, true, true], // [Sun, Mon, Tue, Wed, Thu, Fri, Sat] — Sun closed per GBP
    vacations: [],
    blocked: [],
    leadDays: 0,
    horizonDays: 60
  },
  sections: { pricing: true, work: true, story: true, reviews: true, area: true, igfeed: false },
  seo: {
    title: "Cheez Shine Mobile Detail — Memphis mobile car detailing & pressure washing",
    desc: "Cheez Shine Mobile Detail brings car, truck & SUV detailing plus pressure washing to your driveway across the Memphis area. 5.0-star rated. Instant pricing, easy online booking. Get yo shine on."
  }
};
