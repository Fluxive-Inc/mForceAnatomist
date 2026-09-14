// ⚠ VENDORED — DO NOT EDIT HERE.
// Source of truth: .mforce/lib/machineforce-proxy/machineforce-proxy.js   ·   change it there, then run ./sync-modules.sh
// Synced: 2026-09-14T02:15:28Z
/**
 * machineforce-proxy.js — the service worker that injects the operator's
 * bearer token into API calls so application JavaScript never handles it.
 *
 * The token arrives from launch.js over the message bus and lives only in this
 * worker's memory. Nothing here writes it to storage, and nothing outside can
 * read it back — that is the whole point of the module, and auth-guard.js is
 * written to preserve it.
 *
 * BOUNDED PASSTHROUGH. Every previous copy did `event.respondWith(fetch(req))`
 * with no limit, so a backend that never answers left the tab spinning with
 * nothing the UI could render. Requests this worker adopts are now bounded and
 * fail as a typed JSON body the page can show. A request it does NOT adopt is
 * left entirely alone — never bound something you are not responsible for.
 *
 * Per-app configuration, if the defaults do not fit:
 *   self.MFORCE_PROXY = { timeoutMs: 15000, securedPaths: ['/app', '/system'] };
 *
 * @author sean@fluxive.ai
 */
'use strict';

// An app configures this worker with a sibling file, because a service worker
// has no page context to read from before its first fetch. Optional: absent is
// the normal case and must not break the worker.
try { importScripts('./machineforce-proxy.config.js'); } catch (e) { /* no per-app config */ }

const CFG = Object.assign(
  // securedPaths is EMPTY by default, deliberately. The air-gap redirect is
  // enforcement, and vendoring must never switch on enforcement an app never
  // had — several consumers currently hold a pass-through stub. An app that
  // wants the air gap opts in: self.MFORCE_PROXY = { securedPaths: ['/app'] }.
  { timeoutMs: 15000, securedPaths: [], apiPrefix: '/api/' },
  self.MFORCE_PROXY || {}
);

const TOKEN = { value: null, at: 0 };

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('message', (event) => {
  const data = event && event.data;
  if (!data || data.type !== 'FLUX_AUTH_UPDATE') return;
  if (data.token) { TOKEN.value = data.token; TOKEN.at = Date.now(); }
  else { TOKEN.value = null; TOKEN.at = 0; }
});

/** A failure the page can render, instead of a hang or an opaque network error. */
function failure(status, code, message) {
  return new Response(
    JSON.stringify({ error: { code: code, message: message, source: 'machineforce-proxy' } }),
    { status: status, headers: { 'Content-Type': 'application/json' } }
  );
}

/** fetch with a hard bound. Never rejects — it resolves to something renderable. */
async function bounded(request) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), CFG.timeoutMs);
  try {
    return await fetch(request, { signal: ctl.signal });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      return failure(504, 'upstream_timeout',
        'The service did not respond within ' + Math.round(CFG.timeoutMs / 1000) + ' seconds. Try again.');
    }
    return failure(502, 'upstream_unreachable',
      'The service could not be reached. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }
}

self.addEventListener('fetch', (event) => {
  let url;
  try { url = new URL(event.request.url); } catch (e) { return; }

  const secured = CFG.securedPaths.some((p) => url.pathname.startsWith(p));
  const isApi = url.hostname.endsWith('fluxive.ai') && url.pathname.startsWith(CFG.apiPrefix);

  // Air gap: a secured page with no token goes back to the perimeter.
  if (secured && !TOKEN.value) {
    event.respondWith(Response.redirect('/', 302));
    return;
  }

  // Only adopt API calls we are actually injecting a token into. Everything
  // else — static assets, third-party, same-origin pages — passes untouched.
  if (!isApi || !TOKEN.value) return;

  const authed = new Request(event.request, {
    headers: Object.assign(
      Object.fromEntries(event.request.headers),
      { 'Authorization': 'Bearer ' + TOKEN.value, 'X-Flux-Proxy': 'Secure' }
    )
  });
  event.respondWith(bounded(authed));
});
