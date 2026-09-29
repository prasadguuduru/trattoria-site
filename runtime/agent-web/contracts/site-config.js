// GENERATED from lib/agent-web/contracts/site-config.ts — do not edit here. Regenerate: node scripts/build-agent-site-client.mjs
/**
 * `site-config.ts` — the wire contract between a generated showcase site and
 * the browser runtime it ships (W6.4a).
 *
 * The build service embeds one JSON document (`<script id="agent-site-config"
 * type="application/json">` in index.html AND the standalone
 * `agent-site.config.json` file) describing exactly which agents and actions
 * the page may mount. The runtime boots OFF it: no discovery fetch is needed
 * to render a form, because the `interaction` contract — including the
 * `actionRevision` — is baked in at build time and the server revalidates the
 * revision on every submit (`revision_mismatch` → the runtime's stale-
 * contract flow, never a silent write against a moved schema).
 *
 * Truthfulness rules the parser enforces:
 *
 *   - An entry the parser cannot fully explain drops the ACTION, not the
 *     page — a malformed interaction renders that action's static fallback
 *     link, never a half-formed control.
 *   - `cardId`/`mcpEndpoint` bind each action to its agent — submissions
 *     route to the agent's own endpoint, never to "the site's" endpoint.
 *   - The config carries NO secrets, tokens or owner internals — the page is
 *     a public artifact anyone may host.
 *
 * BROWSER-SAFE: types + pure parsing only.
 */
import { parseActionInteraction } from './interaction.js';
export const AGENT_SITE_CONFIG_VERSION = 1;
/**
 * The DOM contract between the renderer (`site/render-showcase.ts`) and the
 * runtime boot (`client/site-boot.ts`): one mount root per action, identified
 * by card + action ids, holding a static fallback the boot removes only after
 * the real form mounts.
 */
export const AGENT_SITE_CONFIG_ELEMENT_ID = 'agent-site-config';
export const AGENT_SITE_ACTION_ATTR = 'data-agent-action';
export const AGENT_SITE_CARD_ATTR = 'data-card-id';
export const AGENT_SITE_ACTION_ID_ATTR = 'data-action-id';
export const AGENT_SITE_FALLBACK_ATTR = 'data-agent-fallback';
function asRecord(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v)
        ? v
        : null;
}
function asString(v) {
    return typeof v === 'string' && v.length > 0 ? v : null;
}
/**
 * Parse the embedded config. Strict on the shape the runtime depends on
 * (ids, endpoint, interaction); lenient on decoration. Returns null only
 * when the DOCUMENT itself is unusable — a bad action is dropped while its
 * siblings still mount.
 */
export function parseAgentSiteConfig(raw) {
    const doc = asRecord(raw);
    if (!doc || doc.version !== AGENT_SITE_CONFIG_VERSION)
        return null;
    if (!Array.isArray(doc.agents))
        return null;
    const agents = [];
    for (const a of doc.agents) {
        const rec = asRecord(a);
        if (!rec)
            continue;
        const cardId = asString(rec.cardId);
        const name = asString(rec.name);
        const mcpEndpoint = asString(rec.mcpEndpoint);
        if (!cardId || !name || !mcpEndpoint)
            continue;
        const actions = [];
        if (Array.isArray(rec.actions)) {
            for (const act of rec.actions) {
                const ar = asRecord(act);
                if (!ar)
                    continue;
                const actionId = asString(ar.actionId);
                const label = asString(ar.label);
                const interaction = parseActionInteraction(ar.interaction);
                if (!actionId || !label || !interaction)
                    continue;
                actions.push({
                    actionId,
                    label,
                    ...(asString(ar.description) ? { description: ar.description } : {}),
                    interaction,
                });
            }
        }
        agents.push({
            cardId,
            name,
            mcpEndpoint,
            ...(asString(rec.agentPageUrl) ? { agentPageUrl: rec.agentPageUrl } : {}),
            ...(asString(rec.cardViewUrl) ? { cardViewUrl: rec.cardViewUrl } : {}),
            actions,
        });
    }
    return {
        version: AGENT_SITE_CONFIG_VERSION,
        ...(asString(doc.ownerSlug) ? { ownerSlug: doc.ownerSlug } : {}),
        agents,
    };
}
