// ⚠ VENDORED — DO NOT EDIT HERE.
// Source of truth: .mforce/lib/refresh-guard/refresh-guard.js   ·   change it there, then run ./sync-modules.sh
// Synced: 2026-09-14T21:15:06Z
// [Protocol] mForceOS1_refresh-protocol.md
// Handles system update detection and notification.

const RefreshGuard = {
    localVersion: null,

    init: async () => {
        try {
            console.log('🛡️ RefreshGuard: Active');
            // Add a cache-busting timestamp
            const response = await fetch('./version.json?t=' + Date.now());
            if (!response.ok) throw new Error('RefreshGuard: version.json missing');

            const data = await response.json();
            RefreshGuard.localVersion = data.build || data.version;  // key on moving build (K_REVISION)
            console.log('🛡️ RefreshGuard: Baseline Version', RefreshGuard.localVersion);

            // STEP 3: Swarm Reconciliation check-in
            fetch('/api/ledger/reconcile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    version: RefreshGuard.localVersion,
                    clientUrl: window.location.origin,
                    agentHash: 'unsigned-or-cryptographic-proof'
                })
            })
            .then(res => res.json())
            .then(resData => console.log('🛡️ Swarm sync response:', resData))
            .catch(err => console.warn('Ledger check-in failed:', err));

            // Start Polling every 60s
            setInterval(RefreshGuard.check, 60000);
        } catch (e) {
            console.warn('RefreshGuard: Init failed', e);
        }
    },

    check: async () => {
        try {
            const response = await fetch('./version.json?t=' + Date.now());
            const data = await response.json();

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
