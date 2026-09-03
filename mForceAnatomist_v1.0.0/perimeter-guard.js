// ⚠ VENDORED — DO NOT EDIT HERE.
// Source of truth: .mforce/perimeter/guard-c.js   ·   change it there, then run ./sync-perimeter.sh
// Synced: 2026-09-03T16:08:26Z
'use strict';
/**
 * perimeter-guard.js — HARDENED (shared across the consumer apps).
 *
 * ── WHAT THIS REPLACES ──────────────────────────────────────────────────────
 * The previous guard was fail-OPEN in two ways:
 *   1. requireAuth admitted a request on the mere PRESENCE of a __session cookie
 *      — any string passed, so `__session=x` was a full login.
 *   2. /sessionLogin HMAC-signed the raw ID token WITHOUT verifying it, so the
 *      cookie proved nothing.
 *
 * Now:
 *   · /sessionLogin VERIFIES the Firebase ID token with firebase-admin (Google
 *     public certs — verifyIdToken needs no special IAM), then mints a session
 *     that is an HMAC over the VERIFIED {uid,email,exp} claims.
 *   · requireAuth accepts ONLY a session this guard actually signed, checking the
 *     HMAC and expiry in constant time. Fail closed.
 *   · PERIMETER_SECRET is REQUIRED in production — a hardcoded default would let
 *     anyone who reads the source forge a signed cookie without a token at all.
 *
 * Exports the same names the servers already import (`signSession`, `requireAuth`)
 * plus a ready-made `sessionLogin` route handler, so wiring is a one-line change.
 */
const crypto = require('crypto');
const admin = require('firebase-admin');

const PROJECT = process.env.FIREBASE_AUTH_PROJECT || 'fluxive-machineforce';
let _app = null;
function _fb() {
  if (!_app) _app = admin.apps.length ? admin.app() : admin.initializeApp({ projectId: PROJECT });
  return _app;
}

const _PS = process.env.PERIMETER_SECRET;
if (!_PS && process.env.NODE_ENV === 'production') {
  console.error('[perimeter-guard] FATAL: PERIMETER_SECRET must be set in production — refusing to start with a forgeable default.');
  process.exit(1);
}
const SECRET = _PS || 'mforce-perimeter-v1-dev-only';
const MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

function _sig(b64) { return crypto.createHmac('sha256', SECRET).update(b64).digest('base64url'); }
function _encode(claims) {
  const p = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return p + '.' + _sig(p);
}
function _decode(cookie) {
  if (!cookie || typeof cookie !== 'string' || cookie.indexOf('.') < 0) return null;
  const i = cookie.lastIndexOf('.');
  const p = cookie.slice(0, i), sig = cookie.slice(i + 1);
  if (!p || !sig) return null;
  const a = Buffer.from(sig), b = Buffer.from(_sig(p));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const o = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    if (o.exp && Date.now() > o.exp) return null;
    return o;
  } catch (e) { return null; }
}

/** Verify a Firebase ID token → signed session string. Throws if the token is invalid. */
async function signSession(idToken) {
  const decoded = await _fb().auth().verifyIdToken(idToken);
  return _encode({ uid: decoded.uid, email: decoded.email || '', exp: Date.now() + MAX_AGE_MS });
}

/** Drop-in POST /sessionLogin handler: verify the ID token, then set __session. */
async function sessionLogin(req, res) {
  const idToken = req.body && req.body.idToken;
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const cookie = await signSession(idToken);
    res.cookie('__session', cookie, {
      maxAge: MAX_AGE_MS, httpOnly: true, sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    res.json({ status: 'success' });
  } catch (e) {
    res.status(401).json({ error: 'invalid_token' });
  }
}

/** Gate: a valid, self-signed session is required. API → 401; pages → perimeter. */
function requireAuth(req, res, next) {
  const s = _decode(req.cookies && req.cookies.__session);
  if (s) {
    req.authenticatedUser = true;
    req.perimeterUser = { uid: s.uid, email: s.email };
    return next();
  }
  if (req.path && req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  return res.redirect('/');
}

module.exports = { signSession, sessionLogin, requireAuth };
