// GENERATED from lib/agent-web/contracts/types.ts — do not edit here. Regenerate: node scripts/build-agent-site-client.mjs
/**
 * Public site/showcase capability contract — the ONE shape server facts,
 * MCP `nextSteps` proposals, the marketing builder and the exported browser
 * runtime all read.
 *
 * BROWSER-SAFE. This module (and everything under `lib/agent-web/contracts/`)
 * must stay free of Node builtins, `process`, Next APIs, React and DB imports:
 * it is compiled into the standalone generated site runtime. If a fact needs a
 * database read it is resolved server-side and ARRIVES here as data.
 *
 * ── The three rules the shape enforces ─────────────────────────────────────
 *
 * 1. `unknown` is a third answer, not a failed `available`. A capability the
 *    server could not check this call is `unavailable` neither by honesty nor
 *    by omission — it is `unknown`, and nothing downstream may promote it.
 * 2. Server facts are authoritative. `resolveSitePresentationCapabilities`
 *    may only NARROW an `available` (host limitation, transport failure,
 *    in-flight submission); it can never turn `unavailable`/`unknown` into
 *    `available`.
 * 3. No denial reasons on the wire. `unavailable` carries no `why` — the
 *    reason would name the owner's policy, flag posture or consent state.
 *    Authenticated owner surfaces keep their own richer contracts.
 */
export const CAPABILITY_AVAILABLE = Object.freeze({ state: 'available' });
export const CAPABILITY_UNAVAILABLE = Object.freeze({ state: 'unavailable' });
export const CAPABILITY_UNKNOWN = Object.freeze({ state: 'unknown' });
export const SITE_CAPABILITY_KEYS = [
    'viewCard',
    'inspectActions',
    'planSite',
    'browseOwner',
    'listOwnerAgents',
    'buildSite',
    'submitAction',
    'embedChat',
];
/** Version of the `nextSteps` block emitted on `indy_describe_card`. */
export const NEXT_STEPS_VERSION = 1;
