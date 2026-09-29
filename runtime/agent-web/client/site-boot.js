// GENERATED from lib/agent-web/client/site-boot.ts — do not edit here. Regenerate: node scripts/build-agent-site-client.mjs
/**
 * `site-boot.ts` — the generated site's entry point (W6.4a).
 *
 * A built pack ships this file (transpiled, under `runtime/…`) plus an
 * `<script id="agent-site-config">` JSON block and one
 * `<div data-agent-action>` mount root per offered action, each containing
 * the static fallback link the page must show when the runtime cannot run.
 *
 * Boot order matters:
 *
 *   1. Parse the config. A document this parser cannot read mounts NOTHING —
 *      every root keeps its fallback.
 *   2. `createActionRuntime()` throws when fetch/WebCrypto is absent — the
 *      same early-throw the gate requires, so a script-blocked or legacy
 *      browser shows links, not dead forms.
 *   3. Each mount root resolves `data-card-id` + `data-action-id` against the
 *      config. A root naming an action the config does not carry is left
 *      alone (the page may predates the config that describes it).
 *
 * Everything the runtime renders is contract-derived — the page's own
 * markup (headings, links) is never rewritten.
 *
 * BROWSER-SAFE.
 */
import { AGENT_SITE_ACTION_ATTR, AGENT_SITE_ACTION_ID_ATTR, AGENT_SITE_CARD_ATTR, AGENT_SITE_CONFIG_ELEMENT_ID, AGENT_SITE_FALLBACK_ATTR, parseAgentSiteConfig, } from '../contracts/site-config.js';
import { createActionRuntime } from './index.js';
import { mountActionForm } from './dom.js';
function readConfig(doc) {
    const el = doc.getElementById(AGENT_SITE_CONFIG_ELEMENT_ID);
    const text = el?.textContent;
    if (!text)
        return null;
    try {
        return parseAgentSiteConfig(JSON.parse(text));
    }
    catch {
        return null;
    }
}
/**
 * Boot the runtime against a document. Returns null when the page cannot
 * run forms — no throw, so a host page degrades to its fallback markup.
 */
export function bootAgentSite(doc) {
    const config = readConfig(doc);
    if (!config)
        return null;
    let runtime;
    try {
        runtime = createActionRuntime({});
    }
    catch {
        return null;
    }
    const mounts = [];
    const roots = doc.querySelectorAll(`[${AGENT_SITE_ACTION_ATTR}]`);
    for (const el of roots) {
        if (!(el instanceof doc.defaultView.HTMLElement))
            continue;
        const cardId = el.getAttribute(AGENT_SITE_CARD_ATTR);
        const actionId = el.getAttribute(AGENT_SITE_ACTION_ID_ATTR);
        if (!cardId || !actionId)
            continue;
        const agent = config.agents.find((a) => a.cardId === cardId);
        const action = agent?.actions.find((a) => a.actionId === actionId);
        if (!agent || !action)
            continue;
        // The fallback is captured BEFORE mount — the form does not clear root
        // children itself, so the boot hides the link once the real control is in.
        const fallback = el.querySelector(`[${AGENT_SITE_FALLBACK_ATTR}]`);
        try {
            mounts.push(mountActionForm({
                root: el,
                submissions: runtime.submissions,
                bus: runtime.bus,
                action: { mcpUrl: agent.mcpEndpoint, cardId: agent.cardId, actionId: action.actionId },
                interaction: action.interaction,
                onReady: () => fallback?.remove(),
            }));
        }
        catch {
            // One bad mount leaves its fallback standing; siblings still mount.
        }
    }
    return { runtime, mounts };
}
/**
 * Auto-boot when served as the page's own module script. Guarded on the
 * config element so importing this file in a non-site context is inert.
 */
if (typeof document !== 'undefined' && document.getElementById(AGENT_SITE_CONFIG_ELEMENT_ID)) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => bootAgentSite(document));
    }
    else {
        bootAgentSite(document);
    }
}
