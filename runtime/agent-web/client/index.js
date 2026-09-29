// GENERATED from lib/agent-web/client/index.ts — do not edit here. Regenerate: node scripts/build-agent-site-client.mjs
/**
 * `client/index.ts` — the action runtime composer. One runtime per page /
 * mounted surface: a page-scoped bus, one wire client per agent endpoint,
 * one submission controller. `mountActionForm` (in `./dom`) renders against
 * it; the marketing app composes the same controller with React hooks.
 *
 * Construction FAILS EARLY: without `fetch` or a WebCrypto source the
 * runtime cannot mint keys or reach an endpoint — throwing here is what lets
 * a host page keep its static fallback links (the gate requires that a page
 * the runtime cannot run on degrades to links, never a dead form).
 *
 * BROWSER-SAFE.
 */
import { EventBus } from '../../multiverse/event-bus.js';
import { AgentEndpointClient } from './mcp.js';
import { SubmissionController } from './submission.js';
export function createActionRuntime(opts) {
    if (typeof fetch !== 'function') {
        throw new Error('action runtime needs fetch — the host must keep its fallback links');
    }
    const c = globalThis.crypto;
    if (!c || (typeof c.randomUUID !== 'function' && typeof c.getRandomValues !== 'function')) {
        throw new Error('action runtime needs WebCrypto to mint submission keys');
    }
    const bus = opts.bus ?? new EventBus();
    const clients = new Map();
    const clientFor = (mcpUrl) => {
        let client = clients.get(mcpUrl);
        if (!client) {
            client = new AgentEndpointClient(mcpUrl, opts.transport ?? {});
            clients.set(mcpUrl, client);
        }
        return client;
    };
    const submissions = new SubmissionController(clientFor, bus);
    return {
        bus,
        submissions,
        clientFor,
        dispose() {
            submissions.disposeAll();
            clients.clear();
        },
    };
}
