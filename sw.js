/* EDU Library service worker (1.6.1)
   Goal: the app must open with NO internet.
   - Pages: try the network first (so updates arrive), fall back to the saved copy.
   - Own files (splash, images, PDF reader files): saved the first time they are used.
   - Admin tool script (library-manager.js): always the newest copy, saved copy only when offline.
   - Libraries and fonts from CDNs: saved the first time they load.
   - Books, accounts, Edu AI and catalog calls are never touched here. */
const VER = "edu-v160";
const SHELL = VER + "-shell";
const LIBS = VER + "-libs";
const PRE = [
  "/", "/index.html", "/manifest.json", "/icon-192.png",
  "/assets/splash-8.html", "/assets/splash4.jpg", "/assets/transition.png",
  "/assets/pdf.min.js", "/assets/pdf.worker.min.js",
  "/assets/chat-bg.jpg", "/assets/edu-ai-avatar.jpg"
];
const CDN = ["cdn.jsdelivr.net", "cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    /* one by one, so a single missing file never stops the install */
    await Promise.all(PRE.map(u => c.add(new Request(u, { cache: "reload" })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.indexOf(VER) !== 0).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function timeout(ms) { return new Promise((_, no) => setTimeout(() => no(new Error("slow")), ms)); }

async function pageRequest(req) {
  const c = await caches.open(SHELL);
  try {
    const res = await Promise.race([fetch(req), timeout(4000)]);
    if (res && res.ok) c.put(req, res.clone()).catch(() => {});
    return res;
  } catch (e) {
    const hit = (await c.match(req, { ignoreSearch: true })) ||
      (await c.match("/index.html")) || (await c.match("/"));
    if (hit) return hit;
    return new Response("<!DOCTYPE html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><body style='margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#4a1b3c;color:#fff;font-family:sans-serif;text-align:center;padding:24px'><div><div style='font-size:60px'>\uD83D\uDCDA</div><h2>You're Offline</h2><p>Open EDU Library once with internet so it can be saved on this phone.</p></div>", { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

async function savedFirst(req, cacheName) {
  const c = await caches.open(cacheName);
  const hit = await c.match(req);
  const net = fetch(req).then(res => {
    if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()).catch(() => {});
    return res;
  }).catch(() => null);
  return hit || (await net) || Response.error();
}

/* Admin tool script: always ask the network for the newest copy; use the saved one only when offline */
async function freshFirst(req) {
  const c = await caches.open(SHELL);
  try {
    const res = await Promise.race([fetch(req, { cache: "no-cache" }), timeout(6000)]);
    if (res && res.ok) c.put(req, res.clone()).catch(() => {});
    return res;
  } catch (e) {
    return (await c.match(req)) || Response.error();
  }
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (req.headers.has("range")) return;

  if (url.origin === self.location.origin) {
    if (url.pathname === "/sw.js") return;
    if (req.mode === "navigate") { e.respondWith(pageRequest(req)); return; }
    if (url.pathname === "/library-manager.js") { e.respondWith(freshFirst(req)); return; }
    e.respondWith(savedFirst(req, SHELL));
    return;
  }
  if (CDN.indexOf(url.hostname) > -1) e.respondWith(savedFirst(req, LIBS));
});
