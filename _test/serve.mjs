/* Tiny static file server for the harness. Serves the _template dir so
   admin-mock.html (in _test/) can import ./firebase-mock.js, ./fixtures.js
   and reference ../images, ../styles.css etc. relative paths resolve.
   Root = the _template directory (parent of _test).
   Usage: node serve.mjs [port]   (default 8799) */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, ".."); // the _template directory
const PORT = Number(process.argv[2]) || 8799;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath === "/") urlPath = "/_test/admin-mock.html";
    const filePath = normalize(join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end("forbidden"); return; }
    const s = await stat(filePath).catch(() => null);
    if (!s || s.isDirectory()) { res.writeHead(404); res.end("not found: " + urlPath); return; }
    const body = await readFile(filePath);
    res.writeHead(200, { "Content-Type": TYPES[extname(filePath).toLowerCase()] || "application/octet-stream" });
    res.end(body);
  } catch (e) {
    res.writeHead(500); res.end("err: " + e.message);
  }
});

server.listen(PORT, () => console.log("SERVE_READY http://127.0.0.1:" + PORT + "/"));
