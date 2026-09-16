// ⚠ VENDORED — DO NOT EDIT HERE.
// Source of truth: .mforce/lib/mforce-security/mforce-security.js   ·   change it there, then run ./sync-modules.sh
// Synced: 2026-09-15T23:21:36Z
/**
 * mforce-security.js — shared perimeter arming + telemetry for mForce Node services.
 * ════════════════════════════════════════════════════════════════════════════
 * Drop-in Express middleware that turns "PERIMETER ARMED" from a label into a fact:
 *
 *   • FAIL-CLOSED      — no valid session AND no perimeter page → block, never leak the app.
 *   • RATE LIMIT       — per-IP + per-account sliding window on auth/session routes.
 *   • LOCKOUT          — repeated failures temporarily lock an IP/account.
 *   • THREAT SCORING   — headless / bot / datacenter / missing-DNA signals → score 0..100.
 *   • TURNSTILE        — verify a Cloudflare Turnstile token when a request looks suspicious.
 *   • TELEMETRY        — every interaction is emitted to mForceSecurity for analytics.
 *
 * Usage in a service's server.js (after the cookie parser):
 *
 *     const sec = require('./mforce-security')({ system: 'mForceBridge' });
 *     app.use(sec.telemetry());                 // record every request (non-blocking)
 *     app.use('/api/v1/session', sec.armAuth()); // rate-limit + lockout + Turnstile on auth
 *     // inside your sign-in handler on failure:  sec.recordAuthFailure(req, 'bad_password');
 *     // inside your sign-in handler on success:  sec.recordAuthSuccess(req, uid);
 *
 * Env:
 *   SECURITY_INGEST_URL   default https://security.fluxive.ai/api/v1/security/events
 *   MFORCE_API_KEY        service-to-service key used to authenticate the emit
 *   TURNSTILE_SECRET      Cloudflare Turnstile secret (verification). If unset, Turnstile is skipped.
 *   RL_WINDOW_MS          rate-limit window (default 900000 = 15m)
 *   RL_MAX                max attempts per window per key (default 8)
 *   LOCKOUT_MS            lock duration after threshold (default 900000 = 15m)
 */

'use strict';
const https = require('https');
const { URL } = require('url');

module.exports = function initSecurity(opts = {}) {
  const SYSTEM = opts.system || process.env.K_SERVICE || 'unknown';
  const INGEST = process.env.SECURITY_INGEST_URL || 'https://security.fluxive.ai/api/v1/security/events';
  const KEY = process.env.MFORCE_API_KEY || '';

  // ── SEC-INGEST-1 — an emitter with no credential is not an emitter ─────────
  // /api/v1/security/events requires a SERVICE principal, which mforce-access
  // grants only when MFORCE_API_KEY is set on BOTH sides. No pipeline sets it, so
  // every one of these ten services has been posting each request to the SIEM with
  // an EMPTY `X-MForce-Auth`, collecting a 401, and saying nothing — for two
  // reasons that compound: the request succeeds at the transport layer, so
  // `r.on('error')` never fires, and the RESPONSE was never read at all. The SIEM
  // has no inputs and no complaint, which is the worst possible combination for an
  // auditor.
  // Posting without a credential cannot succeed. Say so once, at startup, and stop.
  const CAN_EMIT = !!KEY;
  if (!CAN_EMIT) {
    console.warn(
      '[mforce-security] MFORCE_API_KEY is not set — security telemetry is DISABLED for ' +
      SYSTEM + '. Every event would be rejected 401 by ' + INGEST + ', so none are sent. ' +
      'Set MFORCE_API_KEY (see _build-tasks/AD-84_mforce-service-key.md) to feed the SIEM.'
    );
  }
  // One complaint per process about a rejected ingest, not one per request: this
  // runs on the hot path of every request and a 401 loop must not become the flood.
  let _authComplained = false;
  const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET || '';
  const RL_WINDOW = +(process.env.RL_WINDOW_MS || 15 * 60 * 1000);
  const RL_MAX = +(process.env.RL_MAX || 8);
  const LOCKOUT = +(process.env.LOCKOUT_MS || 15 * 60 * 1000);

  // ── in-memory stores (per-instance; edge/Cloud Armor is the durable layer) ──
  const attempts = new Map(); // key -> [timestamps]
  const locks = new Map();     // key -> unlockAt
  const SWEEP = 60 * 1000;
  setInterval(() => {
    const now = Date.now();
    for (const [k, arr] of attempts) { const f = arr.filter(t => now - t < RL_WINDOW); f.length ? attempts.set(k, f) : attempts.delete(k); }
    for (const [k, t] of locks) if (t <= now) locks.delete(k);
  }, SWEEP).unref?.();

  const ipOf = (req) =>
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress || 'unknown';

  // ── THREAT SCORING: 0 (clean) .. 100 (hostile) ──
  function score(req) {
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    const signals = [];
    let s = 0;
    if (!ua) { s += 40; signals.push('no_user_agent'); }
    if (/headless|phantom|puppeteer|playwright|selenium|webdriver|python-requests|curl|wget|go-http|axios|node-fetch|scrapy/.test(ua)) { s += 55; signals.push('automation_ua'); }
    if (/bot|crawler|spider/.test(ua)) { s += 25; signals.push('bot_ua'); }
    if (req.headers['sec-fetch-mode'] === undefined && ua && !/bot/.test(ua)) { s += 10; signals.push('missing_fetch_metadata'); }
    if (!(req.cookies && req.cookies['__dna'])) { s += 15; signals.push('no_device_dna'); }
    if (!req.headers['accept-language']) { s += 10; signals.push('no_accept_language'); }
    const ip = ipOf(req);
    // crude datacenter / private-egress heuristic (edge WAF is the real check)
    if (/^(3\.|13\.|18\.|34\.|35\.|52\.|54\.|104\.196|130\.211|146\.148)/.test(ip)) { s += 15; signals.push('datacenter_ip'); }
    return { score: Math.min(100, s), signals, ip, ua };
  }

  // ── TURNSTILE verify (Cloudflare) ──
  function verifyTurnstile(token, ip) {
    return new Promise((resolve) => {
      if (!TURNSTILE_SECRET) return resolve(true); // not configured → skip (don't hard-fail prod)
      if (!token) return resolve(false);
      const body = new URLSearchParams({ secret: TURNSTILE_SECRET, response: token, remoteip: ip }).toString();
      const r = https.request('https://challenges.cloudflare.com/turnstile/v0/siteverify',
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) } },
        (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d).success === true); } catch { resolve(false); } }); });
      r.on('error', () => resolve(false));
      r.write(body); r.end();
    });
  }

  // ── TELEMETRY emit (fire-and-forget; never blocks the request) ──
  function emit(event) {
    // SEC-INGEST-1 — no key, no post. The warning above already said why, once.
    if (!CAN_EMIT) return;
    try {
      const payload = JSON.stringify({ system: SYSTEM, ts: new Date().toISOString(), ...event });
      const u = new URL(INGEST);
      const r = https.request({ hostname: u.hostname, path: u.pathname, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-MForce-Auth': KEY, 'Content-Length': Buffer.byteLength(payload) }, timeout: 2500 });
      // SEC-INGEST-1 — the response used to be discarded entirely, so a rejected
      // ingest was indistinguishable from an accepted one. A 401/403 here means the
      // key this service holds is not the key the SIEM accepts, and no amount of
      // retrying fixes that — report it once and keep going.
      r.on('response', (resp) => {
        if ((resp.statusCode === 401 || resp.statusCode === 403) && !_authComplained) {
          _authComplained = true;
          console.error(
            '[mforce-security] the SIEM REJECTED this service\'s telemetry with ' + resp.statusCode +
            ' — MFORCE_API_KEY does not match the key ' + INGEST + ' accepts. Events from ' +
            SYSTEM + ' are not reaching the security log. (Reported once per process.)'
          );
        }
        resp.resume();   // drain, or the socket is held open
      });
      r.on('error', () => { /* deliberate: a network fault here must not affect traffic, and retrying a fire-and-forget event is worse than losing it */ });
      r.on('timeout', () => r.destroy());
      r.write(payload); r.end();
    } catch { /* swallow — security telemetry must never break traffic */ }
  }

  function baseEvent(req, extra) {
    const t = score(req);
    return { ip: t.ip, ua: t.ua, path: req.path, method: req.method,
      threatScore: t.score, signals: t.signals,
      country: req.headers['x-appengine-country'] || req.headers['cf-ipcountry'] || null, ...extra };
  }

  // ── PUBLIC: record every request (mount broadly) ──
  function telemetry() {
    return (req, res, next) => {
      const ev = baseEvent(req, { kind: 'request' });
      res.on('finish', () => emit({ ...ev, status: res.statusCode, kind: res.statusCode >= 400 ? 'request_error' : 'request' }));
      next();
    };
  }

  // ── PUBLIC: arm an auth/session route (rate limit + lockout + turnstile-on-suspicion) ──
  function armAuth() {
    return async (req, res, next) => {
      const ip = ipOf(req);
      const acct = (req.body && (req.body.email || req.body.uid)) || '';
      const keys = [`ip:${ip}`, acct ? `acct:${acct}` : null].filter(Boolean);
      const now = Date.now();

      // locked?
      for (const k of keys) {
        const until = locks.get(k);
        if (until && until > now) {
          emit(baseEvent(req, { kind: 'blocked', reason: 'lockout', lockKey: k, retryInMs: until - now }));
          return res.status(429).json({ error: 'temporarily_locked', retryAfter: Math.ceil((until - now) / 1000) });
        }
      }

      // threat gate — high score must pass Turnstile
      const t = score(req);
      if (t.score >= 60) {
        const ok = await verifyTurnstile(req.body && req.body.turnstileToken, ip);
        if (!ok) {
          emit(baseEvent(req, { kind: 'blocked', reason: 'challenge_failed' }));
          return res.status(403).json({ error: 'verification_required', challenge: 'turnstile' });
        }
      }

      // sliding-window rate limit
      for (const k of keys) {
        const arr = (attempts.get(k) || []).filter(x => now - x < RL_WINDOW);
        arr.push(now); attempts.set(k, arr);
        if (arr.length > RL_MAX) {
          locks.set(k, now + LOCKOUT);
          emit(baseEvent(req, { kind: 'blocked', reason: 'rate_limited', lockKey: k, count: arr.length }));
          return res.status(429).json({ error: 'rate_limited', retryAfter: Math.ceil(LOCKOUT / 1000) });
        }
      }
      req.mforceThreat = t;
      next();
    };
  }

  // ── PUBLIC: call from your sign-in handler ──
  function recordAuthSuccess(req, uid) {
    const ip = ipOf(req);
    attempts.delete(`ip:${ip}`);
    const acct = (req.body && (req.body.email || req.body.uid)) || uid || '';
    if (acct) attempts.delete(`acct:${acct}`);
    emit(baseEvent(req, { kind: 'auth_success', uid: uid || acct || null }));
  }
  function recordAuthFailure(req, reason) {
    emit(baseEvent(req, { kind: 'auth_failure', reason: reason || 'unknown' }));
  }

  // ── PUBLIC: fail-closed helper for the perimeter guard ──
  // Returns true if the request is allowed to reach the app; false = caller must block.
  function failClosed(req, res, { hasSession, perimeterHtmlPath }) {
    if (hasSession) return true;
    const fs = require('fs');
    if (perimeterHtmlPath && fs.existsSync(perimeterHtmlPath)) {
      emit(baseEvent(req, { kind: 'perimeter_served' }));
      res.status(200).sendFile(perimeterHtmlPath);
      return false;
    }
    // no session AND no perimeter page → DENY (never leak the app)
    emit(baseEvent(req, { kind: 'blocked', reason: 'fail_closed_no_perimeter' }));
    res.status(401).send('Unauthorized — perimeter armed.');
    return false;
  }

  return { telemetry, armAuth, recordAuthSuccess, recordAuthFailure, failClosed, score, emit, verifyTurnstile };
};
