// GENERATED from lib/agent-web/contracts/next-steps.ts — do not edit here. Regenerate: node scripts/build-agent-site-client.mjs
/**
 * `nextSteps` — the capability-derived "what can I offer next" list.
 *
 * Every step is emitted ONLY when its capability is `available` AND the
 * facts it needs are present on the snapshot. Missing prerequisites remove
 * the option; they never produce a dead button, a guessed URL or a tool name
 * the caller's `tools/list` does not carry.
 *
 * Ordering is FIXED (the design's proposal-table order) so two builds of the
 * same snapshot emit byte-identical output — a client diffing snapshots must
 * not see churn that means nothing.
 *
 * Owner-authored text never reaches these fields. `label`/`description` are
 * platform constants; the only per-agent data is the verified `url` the
 * server already vouched for inside `links`.
 */
import { NEXT_STEPS_VERSION, } from './types.js';
/** Wire tool names — the `indy_foo` spelling `tools/list` emits. */
export const REQUEST_ACTION_WIRE = 'indy_request_action';
export const LIST_OWNER_AGENTS_WIRE = 'indy_list_owner_agents';
export const BUILD_SITE_WIRE = 'indy_build_site';
function available(snapshot, key) {
    return snapshot.capabilities[key].state === 'available';
}
/** The tool is offered only when the snapshot names it callable. */
function toolListed(snapshot, wireName) {
    return snapshot.effectiveToolNames !== null && snapshot.effectiveToolNames.includes(wireName);
}
export function deriveNextSteps(snapshot) {
    const steps = [];
    if (available(snapshot, 'viewCard') && snapshot.links?.cardViewUrl) {
        steps.push({
            id: 'view-card',
            kind: 'navigate',
            label: "View this agent's visiting card",
            description: 'Open the rendered card page for this agent.',
            url: snapshot.links.cardViewUrl,
        });
    }
    if (available(snapshot, 'inspectActions')
        && toolListed(snapshot, REQUEST_ACTION_WIRE)) {
        steps.push({
            id: 'inspect-actions',
            kind: 'inspect',
            label: "Explore this agent's available actions",
            description: 'List the requests this agent currently accepts. Inspecting an action ' +
                'never submits it.',
            tool: REQUEST_ACTION_WIRE,
            requiredSelections: [],
        });
    }
    if (available(snapshot, 'planSite')) {
        steps.push({
            id: 'plan-site',
            kind: 'plan',
            label: 'Plan a website for this agent',
            description: 'Propose which sections and actions a site for this agent should ' +
                'carry. This is a plan, not a generated artifact.',
        });
    }
    if (available(snapshot, 'browseOwner') && snapshot.links?.ownerPageUrl) {
        steps.push({
            id: 'browse-owner',
            kind: 'navigate',
            label: "Browse this owner's published agents",
            description: 'Open the public index of agents this owner publishes.',
            url: snapshot.links.ownerPageUrl,
        });
    }
    if (available(snapshot, 'listOwnerAgents')
        && toolListed(snapshot, LIST_OWNER_AGENTS_WIRE)) {
        steps.push({
            id: 'choose-owner-agents',
            kind: 'execute',
            label: "Choose this owner's agents for a website",
            description: "List the owner's eligible agents so a person can pick which ones " +
                'to feature.',
            tool: LIST_OWNER_AGENTS_WIRE,
            requiredSelections: ['ownerSlug', 'agents'],
        });
    }
    if (available(snapshot, 'buildSite')
        && toolListed(snapshot, BUILD_SITE_WIRE)) {
        steps.push({
            id: 'build-site',
            kind: 'execute',
            label: 'Build a website with selected actions',
            description: "Generate a static site whose forms submit through each selected " +
                "agent's own endpoint.",
            tool: BUILD_SITE_WIRE,
            requiredSelections: ['domain', 'agents', 'actions'],
        });
    }
    return { version: NEXT_STEPS_VERSION, steps };
}
