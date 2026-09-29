// GENERATED from lib/agent-web/contracts/capability.ts — do not edit here. Regenerate: node scripts/build-agent-site-client.mjs
/**
 * `resolveSitePresentationCapabilities` — the shared pure projection every
 * frontend runs on the server's capability snapshot.
 *
 * ── It may only NARROW ─────────────────────────────────────────────────────
 *
 * Server facts are authoritative. Client facts (transport dead, scripts
 * blocked, a submission already in flight) can move `available` →
 * `unavailable`/`unknown`; NOTHING here moves `unavailable`/`unknown` →
 * `available`. That direction is enforced by construction: `narrow` is the
 * only mutation, and it has no widening branch.
 *
 * Per-action facts follow the same rule: a missing `actionCapabilities` entry
 * resolves `unknown`, never `available`.
 */
import { CAPABILITY_UNKNOWN, CAPABILITY_UNAVAILABLE, } from './types.js';
/** Capabilities whose exercise requires a working MCP transport call. */
const TOOL_BOUND = new Set([
    'inspectActions',
    'listOwnerAgents',
    'buildSite',
    'submitAction',
]);
/** Capabilities whose exercise requires the generated runtime to execute. */
const SCRIPT_BOUND = new Set([
    'inspectActions',
    'listOwnerAgents',
    'buildSite',
    'submitAction',
]);
/** The only direction allowed: available → narrower. */
function narrow(state, to) {
    return state.state === 'available' ? to : state;
}
export function resolveSitePresentationCapabilities(snapshot, facts = {}) {
    if (!facts.transportFailed && !facts.scriptsBlocked && !facts.submissionInFlight) {
        return snapshot;
    }
    const capabilities = {};
    for (const key of Object.keys(snapshot.capabilities)) {
        let state = snapshot.capabilities[key];
        if (facts.transportFailed && TOOL_BOUND.has(key)) {
            // Couldn't reach the endpoint → the capability is UNVERIFIED, not denied.
            state = narrow(state, CAPABILITY_UNKNOWN);
        }
        if (facts.scriptsBlocked && SCRIPT_BOUND.has(key)) {
            // The runtime cannot run → the form cannot exist on this page.
            state = narrow(state, CAPABILITY_UNAVAILABLE);
        }
        if (facts.submissionInFlight && key === 'submitAction') {
            state = narrow(state, CAPABILITY_UNAVAILABLE);
        }
        capabilities[key] = state;
    }
    const actionCapabilities = snapshot.actionCapabilities?.map((a) => ({
        ...a,
        submit: facts.submissionInFlight || facts.scriptsBlocked
            ? narrow(a.submit, CAPABILITY_UNAVAILABLE)
            : facts.transportFailed
                ? narrow(a.submit, CAPABILITY_UNKNOWN)
                : a.submit,
    }));
    return {
        ...snapshot,
        capabilities,
        ...(actionCapabilities ? { actionCapabilities } : {}),
    };
}
