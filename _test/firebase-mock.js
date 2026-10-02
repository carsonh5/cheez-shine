/* ============================================================
   FIREBASE MOCK for the admin harness.
   ------------------------------------------------------------
   Implements the exact subset of the Firebase v10 modular SDK
   that admin.html imports:

     firebase-app.js       : initializeApp
     firebase-auth.js      : getAuth, onAuthStateChanged,
                             signInWithEmailAndPassword,
                             sendPasswordResetEmail, signOut,
                             GoogleAuthProvider, signInWithPopup
     firebase-firestore.js : getFirestore, doc, getDoc, setDoc,
                             updateDoc, deleteDoc, collection,
                             getDocs, query, orderBy

   Also exports a few extras that app.js (not admin.html) uses
   (where, addDoc, serverTimestamp, onSnapshot) so this module
   can double as a mock for the public site if ever needed.

   State lives in-memory. Writes round-trip: setDoc/updateDoc on
   the site content doc and add/update/delete on bookings mutate
   the store, so status taps, availability toggles and settings
   saves persist for the life of the page session.

   The harness rewrites admin.html's three gstatic import URLs to
   point at THIS file (all three specifiers resolve here; the
   named exports cover all three modules).
   ============================================================ */

import { CONTENT, BOOKINGS } from "./fixtures.js";

/* ---------- in-memory store ---------- */
/* Path model mirrors Firestore:
   sites/{siteId}                    -> content doc
   sites/{siteId}/bookings/{id}      -> booking docs
   owners/{uid}                      -> owner presence (not read by admin) */
const store = {
  site: null,            // the content object (set at init from fixtures)
  bookings: new Map(),   // id -> data
  _bkSeq: 1,
};

function deepClone(o) {
  return o == null ? o : JSON.parse(JSON.stringify(o));
}
/* Firestore merge semantics: setDoc(...,{merge:true}) does a shallow
   field merge at the top level (nested objects are replaced wholesale).
   admin.html relies on exactly that (it writes {availability:a} or the
   whole content object with merge:true). */
function shallowMerge(target, patch) {
  const out = { ...(target || {}) };
  for (const k in patch) out[k] = patch[k];
  return out;
}

function seed() {
  store.site = deepClone(CONTENT);
  store.bookings.clear();
  BOOKINGS.forEach((bk, i) => {
    const id = "bk_" + String(i + 1).padStart(3, "0");
    store.bookings.set(id, deepClone(bk));
  });
  store._bkSeq = BOOKINGS.length + 1;
  // expose for the harness/debugging
  if (typeof window !== "undefined") window.__MOCK_STORE = store;
}
seed();

/* ---------- app ---------- */
export function initializeApp(config) {
  return { __mockApp: true, config };
}

/* ---------- auth ---------- */
/* Signed-in owner. Email MUST be in CLIENT.owners for admin to admit it;
   the harness sets CLIENT.owners to include this address. Override via
   window.__MOCK_USER before load to test the "not an owner" path. */
const DEFAULT_USER = { uid: "owner-uid-1", email: "carsonhanna5@gmail.com", displayName: "Owner" };

const authState = {
  user: (typeof window !== "undefined" && window.__MOCK_USER !== undefined)
    ? window.__MOCK_USER
    : DEFAULT_USER,
  listeners: new Set(),
};

export function getAuth() {
  return { __mockAuth: true, get currentUser() { return authState.user; } };
}

function notifyAuth() {
  authState.listeners.forEach((cb) => {
    try { cb(authState.user); } catch (e) { /* swallow */ }
  });
}

export function onAuthStateChanged(auth, cb) {
  authState.listeners.add(cb);
  // fire asynchronously like the real SDK
  Promise.resolve().then(() => { try { cb(authState.user); } catch (e) {} });
  return () => authState.listeners.delete(cb);
}

export function signInWithEmailAndPassword(auth, email, password) {
  const em = String(email || "").trim();
  if (!em || !password) {
    return Promise.reject({ code: "auth/invalid-credential", message: "Missing email or password" });
  }
  // Any non-empty credentials "succeed" as that email so the owner-gate
  // (OWNERS.includes) is what actually decides admission.
  authState.user = { uid: "owner-uid-1", email: em, displayName: em.split("@")[0] };
  notifyAuth();
  return Promise.resolve({ user: authState.user });
}

export function sendPasswordResetEmail(auth, email) {
  if (!email) return Promise.reject({ code: "auth/missing-email" });
  return Promise.resolve();
}

export function signOut(auth) {
  authState.user = null;
  notifyAuth();
  return Promise.resolve();
}

export function GoogleAuthProvider() { return { __google: true }; }
GoogleAuthProvider.prototype = {};

export function signInWithPopup(auth, provider) {
  authState.user = { ...DEFAULT_USER };
  notifyAuth();
  return Promise.resolve({ user: authState.user });
}

/* ---------- firestore ---------- */
export function getFirestore() { return { __mockDb: true }; }

/* doc(db, ...pathSegments) / doc(collectionRef, id)
   Returns a lightweight ref carrying its resolved path. */
export function doc(dbOrColl, ...segs) {
  let path;
  if (dbOrColl && dbOrColl.__isCollection) {
    // doc(collectionRef, id)  or  doc(collectionRef) -> auto id
    const id = segs[0] != null ? segs[0] : autoId();
    path = dbOrColl.path.concat([id]);
  } else {
    path = segs.slice();
  }
  return { __isDoc: true, path, id: path[path.length - 1] };
}

export function collection(db, ...segs) {
  return { __isCollection: true, path: segs.slice() };
}

function autoId() {
  return "bk_" + String(store._bkSeq++).padStart(3, "0") + "_" + Math.random().toString(36).slice(2, 7);
}

/* Resolve a doc ref to a { get, set } accessor on the store. */
function resolveDoc(ref) {
  const p = ref.path;
  // sites/{siteId}
  if (p.length === 2 && p[0] === "sites") {
    return {
      kind: "site",
      get: () => store.site,
      set: (v) => { store.site = v; },
    };
  }
  // sites/{siteId}/bookings/{id}
  if (p.length === 4 && p[0] === "sites" && p[2] === "bookings") {
    const id = p[3];
    return {
      kind: "booking",
      id,
      get: () => store.bookings.get(id),
      set: (v) => { store.bookings.set(id, v); },
      del: () => { store.bookings.delete(id); },
    };
  }
  // owners/{uid} (admin never reads these, but resolve gracefully)
  if (p.length === 2 && p[0] === "owners") {
    return { kind: "owner", get: () => ({}), set: () => {} };
  }
  return { kind: "unknown", get: () => undefined, set: () => {} };
}

function snapshot(id, data) {
  const exists = data !== undefined && data !== null;
  return {
    id,
    exists: () => exists,
    data: () => (exists ? deepClone(data) : undefined),
    get: (field) => (exists ? deepClone(data)[field] : undefined),
  };
}

export function getDoc(ref) {
  const r = resolveDoc(ref);
  const data = r.get();
  return Promise.resolve(snapshot(ref.id, data));
}

export function setDoc(ref, data, opts) {
  const r = resolveDoc(ref);
  const merge = !!(opts && opts.merge);
  const incoming = deepClone(data);
  if (merge) {
    r.set(shallowMerge(r.get(), incoming));
  } else {
    r.set(incoming);
  }
  return Promise.resolve();
}

export function updateDoc(ref, patch) {
  const r = resolveDoc(ref);
  const cur = r.get();
  if (cur === undefined || cur === null) {
    return Promise.reject({ code: "not-found", message: "No document to update" });
  }
  r.set(shallowMerge(cur, deepClone(patch)));
  return Promise.resolve();
}

export function deleteDoc(ref) {
  const r = resolveDoc(ref);
  if (r.del) r.del();
  return Promise.resolve();
}

export function addDoc(collRef, data) {
  const id = autoId();
  store.bookings.set(id, deepClone(data));
  return Promise.resolve({ id });
}

/* query(collectionRef, ...constraints) — we only need orderBy (+ where
   for the public site). Constraints are captured and applied in getDocs. */
export function query(collRef, ...constraints) {
  return { __isQuery: true, coll: collRef, constraints };
}
export function orderBy(field, dir) {
  return { __c: "orderBy", field, dir: dir || "asc" };
}
export function where(field, op, value) {
  return { __c: "where", field, op, value };
}

function collectionDocs(collRef) {
  const p = collRef.path;
  if (p.length === 3 && p[0] === "sites" && p[2] === "bookings") {
    return Array.from(store.bookings.entries()).map(([id, data]) => ({ id, data: deepClone(data) }));
  }
  return [];
}

function cmp(a, b) {
  if (a === b) return 0;
  if (a === undefined || a === null) return -1;
  if (b === undefined || b === null) return 1;
  return a < b ? -1 : 1;
}

export function getDocs(qOrColl) {
  let collRef, constraints = [];
  if (qOrColl && qOrColl.__isQuery) { collRef = qOrColl.coll; constraints = qOrColl.constraints; }
  else { collRef = qOrColl; }

  let rows = collectionDocs(collRef);

  // where
  constraints.filter((c) => c && c.__c === "where").forEach((c) => {
    rows = rows.filter((r) => {
      const v = r.data[c.field];
      switch (c.op) {
        case "==": return v === c.value;
        case "!=": return v !== c.value;
        case ">": return v > c.value;
        case ">=": return v >= c.value;
        case "<": return v < c.value;
        case "<=": return v <= c.value;
        default: return true;
      }
    });
  });

  // orderBy (first one wins for our needs; supports chained but simple)
  const orders = constraints.filter((c) => c && c.__c === "orderBy");
  orders.reverse().forEach((o) => {
    rows.sort((x, y) => {
      const r = cmp(x.data[o.field], y.data[o.field]);
      return o.dir === "desc" ? -r : r;
    });
  });

  const docs = rows.map((r) => snapshot(r.id, r.data));
  return Promise.resolve({
    empty: docs.length === 0,
    size: docs.length,
    docs,
    forEach: (fn) => docs.forEach(fn),
  });
}

/* onSnapshot — not used by admin, but provide a one-shot for app.js parity. */
export function onSnapshot(refOrQuery, cb) {
  if (refOrQuery && (refOrQuery.__isQuery || refOrQuery.__isCollection)) {
    getDocs(refOrQuery).then(cb);
  } else {
    getDoc(refOrQuery).then(cb);
  }
  return () => {};
}

export function serverTimestamp() { return Date.now(); }

/* Reset helper for tests that want a clean store between scenarios. */
export function __reseed() { seed(); }
