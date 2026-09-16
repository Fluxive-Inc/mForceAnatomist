// ⚠ VENDORED — DO NOT EDIT HERE.
// Source of truth: .mforce/lib/mforce-events/mforce-events.js   ·   change it there, then run ./sync-modules.sh
// Synced: 2026-09-15T23:21:36Z
// Shared mForce forensic-event emitter → the mforce.events topic (Recall ingests it).
//   const { emitMforceEvent } = require('./mforce-events');
// Fail-safe: never throws to the caller; a publish failure is logged, not surfaced.
// IAM: this service's runtime SA needs roles/pubsub.publisher on
//      projects/mforcerecall/topics/mforce.events (cross-project).
let _pubsub, _topic;
const SYSTEM = process.env.MFORCE_SYSTEM || process.env.K_SERVICE || 'unknown';
const TOPIC = process.env.MFORCE_EVENTS_TOPIC || 'projects/mforcerecall/topics/mforce.events';
function _getTopic() {
  if (_topic !== undefined) return _topic;
  try { const { PubSub } = require('@google-cloud/pubsub'); _pubsub = new PubSub(); _topic = _pubsub.topic(TOPIC); }
  catch (e) { _topic = null; }
  return _topic;
}
async function emitMforceEvent(evt = {}) {
  try {
    const t = _getTopic(); if (!t) return false;
    const payload = {
      event_id: evt.event_id, ts: evt.ts || new Date().toISOString(),
      source_system: evt.source_system || SYSTEM, category: evt.category || 'lifecycle',
      actor: evt.actor || { type: 'system', id: SYSTEM, handle: SYSTEM, role: 'system' },
      action: evt.action || { type: 'unknown', verb: 'unknown', summary: '', payload: {} },
      outcome: evt.outcome || { severity: 'info' }, context: evt.context || {},
      decision: evt.decision || null, links: evt.links || {}, tags: evt.tags || [],
      org_visibility: evt.org_visibility || 'org',
    };
    await t.publishMessage({ json: payload, attributes: { source: String(payload.source_system), category: String(payload.category) } });
    return true;
  } catch (e) { console.warn('[mforce.events] emit failed (non-fatal):', e.message); return false; }
}
module.exports = { emitMforceEvent };
