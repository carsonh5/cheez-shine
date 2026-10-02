/* ============================================================
   CLIENT CONFIG — the ONE block that changes per client.
   ------------------------------------------------------------
   This is the ONLY per-client wiring file. Fill every REPLACE_ME.
   Everything else that changes (copy, prices, packages, photos,
   hours, story, social) lives in content.js (the DEFAULT_CONTENT
   object) and is edited by the owner in the admin dashboard.

   Loaded as a plain <script> BEFORE app.js / admin.html's module,
   so both read window.CLIENT.  Public-safe: the Firebase web
   config is not a secret — security is enforced by Firebase Auth
   + the Firestore/Storage rules (see firestore.rules), which gate
   owner writes on an owners/{uid} doc, NOT on anything in here.
   ============================================================ */
window.CLIENT = {

  /* siteId — the Firestore document id under /sites/{siteId} that holds
     ALL of this client's content, plus the bookings subcollection at
     /sites/{siteId}/bookings. Use the GitHub repo / Firebase project name.
     Lowercase, hyphenated, no spaces. Example: "broskis-auto-detail". */
  siteId: "cheez-shine",

  /* owners — email addresses allowed into the admin dashboard and inline
     editor. This is the CLIENT-SIDE gate (it only decides whether the UI
     shows the owner tools); the REAL security gate is the owners/{uid}
     Firestore doc checked by firestore.rules. Keep the two in sync:
     every email here must have (a) a Firebase Auth user and (b) an
     owners/{uid} doc. Include the client's email + your own admin email. */
  owners: ["REPLACE_ME-owner@example.com", "REPLACE_ME-admin@example.com"],

  /* firebase — the web app config from the Firebase console
     (Project settings -> General -> Your apps -> Web app -> SDK config).
     Public-safe by design. Copy the object verbatim. */
  firebase: {
    apiKey: "REPLACE_ME",
    authDomain: "REPLACE_ME.firebaseapp.com",
    projectId: "REPLACE_ME",
    storageBucket: "REPLACE_ME.firebasestorage.app",
    messagingSenderId: "REPLACE_ME",
    appId: "REPLACE_ME"
  },

  /* accent — the brand color (hex). Drives the CSS --accent variable
     (buttons, highlights, map ring, tags). This is the INITIAL value;
     the owner can change it later in admin Settings, which writes to
     content.brand.accent and overrides this. Keep content.js's
     brand.accent matching this so the first paint is on-brand.
     (Placeholder is a neutral blue — swap for the client's brand hex.) */
  accent: "#E8A33D",

  /* map — the service-area map on the public site (Leaflet).
       center: [lat, lng] the map + coverage ring center on.
       radius: coverage-ring radius in METERS (17000 ~= 10.5 miles).
       cities: pins to drop, each ["Label", lat, lng]. Also used as the
               geocoder bias for the booking address autocomplete.
     REPLACE the example coordinates below with the client's real service
     area. If center is left null the map section simply does not render. */
  map: {
    center: [35.1174, -90.0290],   // Memphis metro, nudged toward the West Memphis base across the river
    radius: 20000,                  // ~12.4 miles — covers Memphis metro + near suburbs
    cities: [
      ["Memphis", 35.1495, -90.0490],
      ["West Memphis", 35.1465, -90.1848],
      ["Germantown", 35.0867, -89.8101],
      ["Bartlett", 35.2045, -89.8740],
      ["Cordova", 35.1562, -89.7762],
      ["Southaven", 34.9890, -90.0126]
    ]
  },

  /* phoneRaw — E.164 tel/sms fallback number (+1 + 10 digits, no
     punctuation). Used only as a fallback before content loads; once
     content.js loads, the live number comes from business.phone. Keep
     this matching content.js business.phone so early taps still dial. */
  phoneRaw: "+15592608749"
};
