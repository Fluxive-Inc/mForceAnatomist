// ⚠ VENDORED — DO NOT EDIT HERE.
// Source of truth: .mforce/lib/refresh-guard/refresh-guard.js   ·   change it there, then run ./sync-modules.sh
// Synced: 2026-09-20T17:37:54Z
// [Protocol] mForceOS1_refresh-protocol.md
// Handles system update detection and notification.
//
// ── WHY THE CHECK-IN IS OPTIONAL ─────────────────────────────────────────────
// RefreshGuard is vendored into every app in the fleet, but /api/ledger/reconcile
// is served by exactly ONE of them (mForceLedger, which answers it locally as a
// telemetry ack). Everywhere else that POST lands on the SPA fallback, which
// answers 200 with an HTML document — and `res.json()` on a document throws
//     SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
// on every single page load, in every app, forever. The check-in is telemetry;
// the real update signal is the version.json poll below. So it is now:
//   · skipped entirely when version.json says the app does not serve it,
//   · content-type checked before anything is parsed as JSON,
//   · and disabled for the rest of the session after one unavailable reply,
// which means an app that cannot answer it stays silent instead of shouting
// once per load about a route it was never going to have.
//
// version.json may opt in or out explicitly:
//     { "build": "...", "reconcile": "/api/ledger/reconcile" }   → use that URL
//     { "build": "...", "reconcile": false }                     → never check in
//     { "build": "..." }                                         → try once, then
//                                                                  stay quiet

const RefreshGuard = {
    localVersion: null,
    reconcileEnabled: true,

    // A response is only JSON when the server says it is. Every SyntaxError this
    // module ever produced came from trusting a 200 and parsing the body blind.
    _json: async (response) => {
        if (!response || !response.ok) return null;
        const ct = (response.headers && response.headers.get('content-type')) || '';
        if (ct.indexOf('json') === -1) return null;
        try { return await response.json(); } catch (e) { return null; }
    },

    _reconcile: async (url) => {
        if (!RefreshGuard.reconcileEnabled) return;
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    version: RefreshGuard.localVersion,
                    clientUrl: window.location.origin,
                    agentHash: 'unsigned-or-cryptographic-proof'
                })
            });
            const data = await RefreshGuard._json(res);
            if (data) { console.debug('🛡️ RefreshGuard: swarm sync', data); return; }
            // Served by something that is not the reconcile endpoint (SPA fallback,
            // 404 page, proxy error). Not a fault — this app simply does not offer it.
            RefreshGuard.reconcileEnabled = false;
            console.debug('🛡️ RefreshGuard: no reconcile endpoint here (HTTP '
                + (res && res.status) + ') — check-in disabled for this session.');
        } catch (e) {
            RefreshGuard.reconcileEnabled = false;
            console.debug('🛡️ RefreshGuard: reconcile unreachable — check-in disabled '
                + 'for this session. ' + ((e && e.message) || e));
        }
    },

    init: async () => {
        try {
            console.log('🛡️ RefreshGuard: Active');
            // Add a cache-busting timestamp
            const response = await fetch('./version.json?t=' + Date.now());
            const data = await RefreshGuard._json(response);
            if (!data) throw new Error('RefreshGuard: version.json missing or not JSON');

            RefreshGuard.localVersion = data.build || data.version;  // key on moving build (K_REVISION)
            console.log('🛡️ RefreshGuard: Baseline Version', RefreshGuard.localVersion);

            // STEP 3: Swarm Reconciliation check-in (optional — see header)
            const target = (data.reconcile === undefined) ? '/api/ledger/reconcile' : data.reconcile;
            if (target) RefreshGuard._reconcile(target);
            else RefreshGuard.reconcileEnabled = false;

            // Start Polling every 60s
            setInterval(RefreshGuard.check, 60000);
        } catch (e) {
            console.warn('RefreshGuard: Init failed', e);
        }
    },

    check: async () => {
        try {
            const response = await fetch('./version.json?t=' + Date.now());
            const data = await RefreshGuard._json(response);
            if (!data) return;   // a momentary 5xx or an HTML error page is not a new build

            const remote = data.build || data.version;
            if (remote && remote !== RefreshGuard.localVersion) {
                console.warn('🚨 RefreshGuard: Version Mismatch! New:', remote, 'Old:', RefreshGuard.localVersion);
                // Version Mismatch - Show Toast
                const toast = document.getElementById('fx-refresh-toast');
                if (toast) {
                    toast.classList.add('visible');
                }
            }
        } catch (e) {
            console.warn('RefreshGuard: Check failed', e);
        }
    }
};

document.addEventListener('DOMContentLoaded', RefreshGuard.init);
