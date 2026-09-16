// ⚠ VENDORED — DO NOT EDIT HERE.
// Source of truth: .mforce/lib/errlog-console/errlog-console.js   ·   change it there, then run ./sync-modules.sh
// Synced: 2026-09-15T23:21:36Z
'use strict';
/**
 * errlog-console.js — forward console.error/console.warn to the central errlog
 * (fluxive.science) so real diagnostics land on the fleet dashboard instead of
 * scrolling past in Cloud Run logs. Production-only, throttled, fire-and-forget,
 * and fail-safe: it never throws and never touches console.log/info. (C4-ERRLOG-CONSOLE)
 *   env: ERRLOG_URL (ingest endpoint) · MFORCE_SYSTEM (label)
 */
try {
  const SYSTEM = process.env.MFORCE_SYSTEM || process.env.K_SERVICE || 'unknown';
  const URL = process.env.ERRLOG_URL || 'https://fluxive.science/api/errlog/ingest';
  const MAX_PER_MIN = 60;
  let sent = 0, windowStart = Date.now();
  function forward(level, args) {
    if (process.env.NODE_ENV !== 'production') return;
    const now = Date.now();
    if (now - windowStart > 60000) { windowStart = now; sent = 0; }
    if (sent >= MAX_PER_MIN) return;            // never flood the ingest
    sent++;
    try {
      const message = args.map((a) => { try { return typeof a === 'string' ? a : JSON.stringify(a); } catch (_) { return String(a); } }).join(' ').slice(0, 2000);
      if (typeof fetch === 'function') {
        // FLT-SAY-6 — this `.catch(() => {})` is CORRECT and stays; what was missing is
        // the sentence saying so. Reporting a failed error-report goes through
        // console.error, which is the function this shim has just wrapped: the report
        // fails again, forwards again, and the loop only ends when the rate limiter
        // above cuts it off. So the one place a dropped rejection is the right answer
        // is here. The convention this fleet uses (say-the-specific-thing.md, and the
        // audit in _scripts/audit-swallowed-errors.sh) is that deliberate suppression
        // SAYS WHY, INLINE — otherwise a careful line is indistinguishable from a
        // careless one and the audit's count means nothing.
        fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ system: SYSTEM, level, message, ts: new Date().toISOString() }) })
          .catch(() => {});   // deliberate: see above — reporting this would recurse
      }
    } catch (_) { /* diagnostics must never break the app */ }
  }
  for (const lvl of ['error', 'warn']) {
    const orig = console[lvl].bind(console);
    console[lvl] = function (...args) { orig(...args); forward(lvl, args); };
  }
} catch (_) { /* fail-open: logging shim must never crash boot */ }
module.exports = {};
