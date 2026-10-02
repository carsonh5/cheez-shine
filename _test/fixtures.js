/* ============================================================
   TEST FIXTURES for the admin mock harness.
   ------------------------------------------------------------
   Seeds the in-memory Firestore mock with:
     - the content doc (mirrors content.js DEFAULT_CONTENT, with a
       few real-looking overrides so the dashboard shows a named
       business and configured EmailJS/review link)
     - ~25 bookings spanning every status / date / edge case the
       admin has to render
     - blocked days (past + future) + a vacation range
     - ~10 distinct customers, several with repeat bookings

   Dates are computed relative to "today" at load time so the
   fixture always has real past / today / future rows no matter
   when the harness runs. Booking `created` is a plain millisecond
   number (the mock's orderBy sorts on it; Firestore Timestamps
   sort the same way, and admin.html never calls .toDate()).
   ============================================================ */

/* ---- date helpers (local time, YYYY-MM-DD) ---- */
function ymd(d) {
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}
function dayOffset(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return ymd(d);
}
export const TODAY = dayOffset(0);

/* Named relative dates used across the fixture. */
const D = {
  past30: dayOffset(-30),
  past21: dayOffset(-21),
  past14: dayOffset(-14),
  past10: dayOffset(-10),
  past7: dayOffset(-7),
  past5: dayOffset(-5),
  past3: dayOffset(-3),
  past2: dayOffset(-2),
  yesterday: dayOffset(-1),
  today: dayOffset(0),
  tomorrow: dayOffset(1),
  in2: dayOffset(2),
  in3: dayOffset(3),
  in4: dayOffset(4),
  in5: dayOffset(5),
  in6: dayOffset(6),
  in7: dayOffset(7),
  in10: dayOffset(10),
  in14: dayOffset(14),
  in21: dayOffset(21),
  in30: dayOffset(30),
};

/* ---- the content doc ---- */
/* Mirrors content.js DEFAULT_CONTENT closely but with a real business
   name, a configured EmailJS block (so promos/review buttons are "On"),
   a review link, and an availability block that already has a couple of
   blocked slots + a vacation so those admin panels render populated. */
export const CONTENT = {
  business: {
    name: "Broski's Auto Detail",
    nameSub: "Mobile Detailing",
    phone: "(720) 555-0184",
    email: "hello@broskisdetail.com",
    license: "",
    owner: "Marcus",
  },
  hero: {
    headline: "Showroom finish.",
    em: "Your driveway.",
    sub: "Interior and exterior detailing for cars, trucks, boats and RVs — done at your home or office across the metro.",
    mark: "Mobile detailing  ·  Owner-operated  ·  We come to you",
    photo: "./images/hero.jpg",
    photoPosX: 60, photoPosY: 50, photoZoom: 100,
  },
  brand: { accent: "#2563EB" },
  pricingLead: "Pick a package, add your vehicle and any extras, and your price updates as you go.",
  packages: [
    { id: "basic", name: "Basic Interior", price: 60, desc: "", list: ["Full interior vacuum & wipe-down", "Windows, dash & console cleaned", "Door jambs & trash-out", "Light deodorize"] },
    { id: "gold", name: "Full Detail", price: 160, featured: true, tag: "Most chosen", list: ["Full interior clean & shampoo", "Exterior hand wash", "Clay bar & leather care", "Hand wax & wheels dressed"] },
    { id: "platinum", name: "Buff & Ceramic", price: 290, tag: "Best protection", desc: "", list: ["Everything in Full Detail", "Paint correction buff", "Engine bay cleaning", "Ceramic sealant & showroom finish"] },
  ],
  vehicles: [
    { id: "sedan", label: "Sedan", add: 0 },
    { id: "suv", label: "SUV", add: 30 },
    { id: "truck", label: "Truck", add: 50 },
    { id: "xl", label: "Oversized", add: 70 },
  ],
  addons: [
    { id: "pethair", label: "Pet hair removal", add: 40 },
    { id: "stains", label: "Shampoo & stain extraction", add: 50 },
    { id: "protect", label: "Fabric & leather protection", add: 45 },
    { id: "engine", label: "Engine bay cleaning", add: 50 },
  ],
  included: { basic: [], gold: [], platinum: ["engine"] },
  workHeading: "Your vehicle could look like this.",
  gallery: [
    { src: "./images/gal-1.jpg", cap: "Wash, full buff & ceramic wax" },
    { src: "./images/gal-2.jpg", cap: "Complete interior, shampoo & leather care" },
    { src: "./images/gal-3.jpg", cap: "Full buff, ceramic wax & engine bay" },
    { src: "./images/gal-4.jpg", cap: "Seats & floor, deep cleaned" },
    { src: "./images/gal-5.jpg", cap: "Exterior detail & decal removal" },
    { src: "./images/gal-6.jpg", cap: "Boat — full buff & polish" },
  ],
  story: {
    over: "From the owner",
    quote: "Started detailing out of my garage on weekends and never looked back. Every car gets the same care I'd give my own.",
    cite: "Marcus, Broski's Auto Detail",
  },
  reviews: [
    { name: "Dana R.", text: "Truck looked better than the day I bought it. On time, super thorough.", source: "Google" },
  ],
  area: {
    lead: "Fully mobile across the metro and the nearby suburbs.",
    cities: ["Thornton", "Northglenn", "Westminster", "Broomfield"],
  },
  hours: "Mon–Fri 9:00a–7:30p · Sat 10:00a–7:30p · Sun by appointment.",
  social: { ig: "@broskisdetail", fb: "https://facebook.com/broskisdetail", yelp: "", nextdoor: "", igFeedOn: false },
  booking: {
    notifyEmail: "hello@broskisdetail.com",
    photoUploadOn: true,
    payLink: "https://buy.stripe.com/test_broskis",
    payLabel: "Pay a deposit to lock your spot",
    payOn: true,
    reviewLink: "https://g.page/r/broskis-review",
    emailjs: { serviceId: "service_broskis", templateId: "template_bk", publicKey: "pk_test_broskis" },
  },
  availability: {
    slotMode: "windows",
    slots: ["Morning (9–12)", "Midday (12–3)", "Afternoon (3–7)"],
    openDays: [false, true, true, true, true, true, true], // Sun off
    vacations: [
      { start: D.in14, end: D.in21, label: "Out of town — family trip" },
    ],
    blocked: [
      { date: D.past5, slot: "Morning (9–12)" },   // past blocked slot
      { date: D.in7, slot: "" },                    // future whole-day block
      { date: D.in10, slot: "Afternoon (3–7)" },    // future blocked slot
    ],
    leadDays: 0,
    horizonDays: 60,
  },
  sections: { pricing: true, work: true, story: true, reviews: false, area: true, igfeed: false },
  seo: {
    title: "Broski's Auto Detail — Mobile Detailing",
    desc: "Broski's Auto Detail brings interior and exterior detailing to your home or office across the metro.",
  },
};

/* ---- bookings ---- */
/* created is a millisecond timestamp; newest first is what the admin
   query asks for (orderBy created desc). We assign created descending
   so the visual order is deterministic. */
let _seq = Date.now();
function b(o) {
  // each subsequent booking gets an older created stamp
  _seq -= 60000;
  return { status: "new", created: _seq, ...o };
}

export const BOOKINGS = [
  // --- brand new requests (unconfirmed) ---
  b({ name: "Jessica Alvarado", phone: "(720) 555-0132", email: "jess.alvarado@gmail.com",
      date: D.tomorrow, time: "Morning (9–12)", address: "1240 Cedar Ln, Thornton",
      package: "Full Detail", vehicle: "SUV", estimate: "$190", addons: "Pet hair removal",
      notes: "Two golden retrievers — heavy shedding in the back.", status: "new" }),

  b({ name: "Bartholomew Featherstonehaugh-Worthington III", phone: "(303) 555-0177",
      email: "bartholomew.featherstonehaugh.worthington@verylongcorporatedomainname.example.com",
      date: D.in3, time: "Afternoon (3–7)", address: "8890 Grandview Estates Boulevard, Apartment 14C, Northglenn, Colorado 80233",
      package: "Buff & Ceramic", vehicle: "Oversized lifted diesel dually with aftermarket bed cover and running boards",
      estimate: "$1,240", addons: "Engine bay cleaning, Fabric & leather protection, Shampoo & stain extraction",
      notes: "Please call before arriving, the gate code changed. Also there is a very long note here to test wrapping and overflow on narrow screens because owners paste huge notes sometimes and we do not want it to blow out the layout on a phone.",
      status: "new" }),

  b({ name: "Mike", phone: "720-555-0199", email: "",
      date: D.in2, time: "Midday (12–3)", address: "Near King Soopers on 120th",
      package: "Basic Interior", vehicle: "Sedan", estimate: "$60", addons: "", notes: "", status: "new" }),

  // same-day pair -> DOUBLE BOOKING case (two on D.in5, overlapping time)
  b({ name: "Priya Nair", phone: "(720) 555-0143", email: "priya.nair@outlook.com",
      date: D.in5, time: "Morning (9–12)", address: "455 Aspen Ct, Westminster",
      package: "Full Detail", vehicle: "SUV", estimate: "$190", addons: "", notes: "", status: "new" }),
  b({ name: "Tom Becker", phone: "(720) 555-0161", email: "tbecker@example.com",
      date: D.in5, time: "Morning (9–12)", address: "77 Birch St, Westminster",
      package: "Basic Interior", vehicle: "Truck", estimate: "$110", addons: "", notes: "Overlaps Priya — same morning slot.", status: "new" }),

  // booking with photo refs + big estimate
  b({ name: "Angela Whitfield", phone: "(303) 555-0110", email: "awhitfield@example.com",
      date: D.in4, time: "Afternoon (3–7)", address: "2100 Marina Way (boat in driveway), Broomfield",
      package: "Buff & Ceramic", vehicle: "26ft wakeboard boat on trailer", estimate: "$2,850",
      addons: "Ceramic sealant", notes: "Boat — see photos for oxidation on the hull.",
      photos: ["./images/gal-6.jpg", "./images/gal-3.jpg", "./images/gal-1.jpg"], status: "new" }),

  // edge phone/email formats
  b({ name: "José García-Ñoño", phone: "+1 (720) 555.0128", email: "JOSE.GARCIA@EXAMPLE.CO.UK",
      date: D.in6, time: "Midday (12–3)", address: "12 Piñon Pl, Thornton",
      package: "Full Detail", vehicle: "Sedan", estimate: "$160", addons: "", notes: "Accents in name test.", status: "new" }),
  b({ name: "no-space-email", phone: "7205550153", email: "weirdemail@@example..com",
      date: D.in7, time: "", address: "", package: "Custom", vehicle: "", estimate: "by text",
      addons: "", notes: "Malformed email + no time chosen + on a whole-day-blocked date.", status: "new" }),

  // --- confirmed (upcoming) ---
  b({ name: "Rachel Kim", phone: "(720) 555-0121", email: "rachel.kim@gmail.com",
      date: D.tomorrow, time: "Afternoon (3–7)", address: "9001 Willow Bend, Northglenn",
      package: "Full Detail", vehicle: "SUV", estimate: "$190", addons: "Fabric & leather protection",
      notes: "", status: "confirmed" }),
  b({ name: "David Osei", phone: "(303) 555-0166", email: "d.osei@example.com",
      date: D.in3, time: "Morning (9–12)", address: "330 Quartz St, Broomfield",
      package: "Buff & Ceramic", vehicle: "Truck", estimate: "$340", addons: "Engine bay cleaning",
      notes: "", status: "confirmed" }),
  // confirmed on the SAME date+time as another confirmed (already-double-booked, to test the guard on an EXISTING clash)
  b({ name: "Lena Petrova", phone: "(720) 555-0188", email: "lena.p@example.com",
      date: D.in10, time: "Morning (9–12)", address: "58 Cobalt Dr, Westminster",
      package: "Full Detail", vehicle: "Sedan", estimate: "$160", addons: "", notes: "", status: "confirmed" }),

  // --- today ---
  b({ name: "Grant Ellison", phone: "(720) 555-0104", email: "grant.e@example.com",
      date: D.today, time: "Morning (9–12)", address: "744 Slate Ave, Thornton",
      package: "Full Detail", vehicle: "SUV", estimate: "$190", addons: "", notes: "Job for today.", status: "confirmed" }),
  b({ name: "Sofia Delgado", phone: "(720) 555-0115", email: "sofia.d@example.com",
      date: D.today, time: "Afternoon (3–7)", address: "1502 Ember Ln, Northglenn",
      package: "Basic Interior", vehicle: "Sedan", estimate: "$60", addons: "", notes: "", status: "new" }),

  // --- done (past) ---
  b({ name: "Rachel Kim", phone: "(720) 555-0121", email: "rachel.kim@gmail.com",
      date: D.past7, time: "Morning (9–12)", address: "9001 Willow Bend, Northglenn",
      package: "Basic Interior", vehicle: "SUV", estimate: "$90", addons: "", notes: "", status: "done" }),
  b({ name: "David Osei", phone: "(303) 555-0166", email: "d.osei@example.com",
      date: D.past14, time: "Midday (12–3)", address: "330 Quartz St, Broomfield",
      package: "Full Detail", vehicle: "Truck", estimate: "$210", addons: "", notes: "", status: "done" }),
  b({ name: "David Osei", phone: "(303) 555-0166", email: "d.osei@example.com",
      date: D.past30, time: "Morning (9–12)", address: "330 Quartz St, Broomfield",
      package: "Buff & Ceramic", vehicle: "Truck", estimate: "$340", addons: "Engine bay cleaning", notes: "", status: "done" }),
  b({ name: "Marcus Bell", phone: "(720) 555-0198", email: "marcusbell@example.com",
      date: D.past21, time: "Afternoon (3–7)", address: "61 Onyx Ct, Thornton",
      package: "Full Detail", vehicle: "Sedan", estimate: "$160", addons: "", notes: "", status: "done" }),
  b({ name: "Priya Nair", phone: "(720) 555-0143", email: "priya.nair@outlook.com",
      date: D.past10, time: "Morning (9–12)", address: "455 Aspen Ct, Westminster",
      package: "Basic Interior", vehicle: "SUV", estimate: "$90", addons: "", notes: "", status: "done" }),
  b({ name: "Priya Nair", phone: "(720) 555-0143", email: "priya.nair@outlook.com",
      date: D.past30, time: "Midday (12–3)", address: "455 Aspen Ct, Westminster",
      package: "Full Detail", vehicle: "SUV", estimate: "$190", addons: "", notes: "", status: "done" }),

  // --- cancelled ---
  b({ name: "Hannah Cole", phone: "(303) 555-0175", email: "hannah.cole@example.com",
      date: D.past3, time: "Afternoon (3–7)", address: "88 Maple Row, Broomfield",
      package: "Full Detail", vehicle: "Sedan", estimate: "$160", addons: "", notes: "Customer rescheduled then no-showed.", status: "cancelled" }),
  b({ name: "Derek Vaughn", phone: "(720) 555-0192", email: "",
      date: D.yesterday, time: "Morning (9–12)", address: "9 Flint St, Northglenn",
      package: "Basic Interior", vehicle: "Truck", estimate: "$110", addons: "", notes: "", status: "cancelled" }),

  // --- more variety / volume ---
  b({ name: "Olivia Chen", phone: "(720) 555-0137", email: "olivia.chen@example.com",
      date: D.past2, time: "Midday (12–3)", address: "410 Sage Blvd, Westminster",
      package: "Full Detail", vehicle: "SUV", estimate: "$190", addons: "Pet hair removal", notes: "", status: "done" }),
  b({ name: "Marcus Bell", phone: "(720) 555-0198", email: "marcusbell@example.com",
      date: D.in21, time: "Morning (9–12)", address: "61 Onyx Ct, Thornton",
      package: "Buff & Ceramic", vehicle: "Sedan", estimate: "$290", addons: "", notes: "Books during owner's vacation range — should still show.", status: "new" }),
  b({ name: "Wendy Ashford", phone: "(303) 555-0158", email: "wendy.ashford@example.com",
      date: D.in30, time: "Afternoon (3–7)", address: "5 Terrace View, Broomfield",
      package: "Full Detail", vehicle: "Oversized", estimate: "$230", addons: "", notes: "", status: "new" }),
  b({ name: "Carlos Mendez", phone: "(720) 555-0146", email: "carlos.mendez@example.com",
      date: D.in2, time: "Afternoon (3–7)", address: "220 Ridgeline Dr, Thornton",
      package: "Basic Interior", vehicle: "Sedan", estimate: "$60", addons: "", notes: "", status: "confirmed" }),
];

/* Sanity: this fixture set intentionally contains
   - statuses: new, confirmed, done, cancelled
   - dates: past (many), today (2), future (many)
   - a same-day overlapping pair on D.in5 (double-booking)
   - repeat customers: Rachel Kim (2), David Osei (3), Priya Nair (3), Marcus Bell (2)
   - long name / long vehicle / long note / long email
   - a booking with photos[]
   - a booking on a whole-day-blocked date (no-space-email on D.in7)
   - a booking during a vacation range (Marcus Bell on D.in21)
*/
