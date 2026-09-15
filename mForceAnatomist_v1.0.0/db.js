const { Pool } = require('pg');

// ── FPQ-3 · DB_USER is required, never defaulted ────────────────────────────
// This used to read `process.env.DB_USER || 'postgres'`. That default is the
// cluster SUPERUSER, so a missing variable did not fail — it quietly connected
// with more privilege than this service is meant to have, and segregation was
// decided by an environment variable nothing checked. It is also how a correct
// password still produces an auth failure, because the role is wrong.
// Production fails closed and names the variable. Development keeps today's
// behaviour with a warning, so nobody's local loop breaks over a variable that
// is only ever set in Cloud Run. Same shape as mForceBookkeeping's db/pool.js,
// which is the app that already had this right.
function _requireDbUser() {
    const u = process.env.DB_USER;
    if (u) return u;
    // WHICH SIGNAL MEANS "PRODUCTION" HERE. The obvious gate is NODE_ENV, and it
    // is the wrong one in this fleet: of the 14 apps this fix touches, 9 deploy to
    // Cloud Run without ever setting NODE_ENV, so a NODE_ENV gate would take the
    // development branch on the very services it exists to protect. (The same hole
    // is in mForceBookkeeping's db/pool.js, which this helper is modelled on —
    // tracked as FPQ-18.) K_SERVICE is set by Cloud Run itself on every revision;
    // it cannot be forgotten in a pipeline, which is exactly the property a
    // fail-closed gate needs. NODE_ENV is kept as a second trigger so a container
    // run anywhere else can still opt in.
    const inProduction = !!process.env.K_SERVICE || process.env.NODE_ENV === 'production';
    if (inProduction) {
        throw new Error(
            '[db] FATAL: DB_USER is not set. Refusing to connect as the cluster ' +
            "superuser — set DB_USER to this service's own database role."
        );
    }
    console.warn('[db] DB_USER is not set — using the cluster superuser. Development only.');
    return 'postgres';
}


const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: _requireDbUser(),
  password: process.env.DB_PASSWORD || process.env.DB_PASS || (process.env.NODE_ENV === 'production' ? undefined : 'password'),
  database: process.env.DB_NAME || 'mforce_anatomist',
  port: process.env.DB_PORT || 5432,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
