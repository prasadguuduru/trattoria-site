// GENERATED from lib/agent-web/client/mcp.ts — do not edit here. Regenerate: node scripts/build-agent-site-client.mjs
/**
 * `client/mcp.ts` — the runtime's wire client: `tools/call` over the shared
 * streamable-HTTP transport (`../transport/mcp.ts`), normalizing a tool
 * result into `{structured, isError, text}`. It validates WIRE SHAPE only —
 * a malformed structured block is a transport-class answer, not a business
 * refusal. All domain decisions (phases, retries, conflict meaning) live in
 * `submission.ts`; this layer answers exactly one question: "what did the
 * endpoint say?"
 *
 * BROWSER-SAFE (see `../contracts/types.ts` header): fetch + AbortSignal via
 * the transport; no Node globals, no cookies, no credentials.
 */
import { rpcPost } from '../transport/mcp.js';
import { REQUEST_ACTION_WIRE } from '../contracts/next-steps.js';
import { parseActionInteraction, } from '../contracts/interaction.js';
function isRecord(v) {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}
/**
 * The wire call an `indy_request_action` execute makes. `signal` is the
 * caller's AbortController — a disposed draft cancels its own in-flight
 * call rather than leaving a write result dangling.
 */
export class AgentEndpointClient {
    constructor(endpoint, transport = {}) {
        this.endpoint = endpoint;
        this.transport = transport;
        this.requestSeq = 0;
    }
    async callTool(name, args, signal) {
        const id = ++this.requestSeq;
        const payload = {
            jsonrpc: '2.0',
            id,
            method: 'tools/call',
            params: { name, arguments: args },
        };
        const out = await rpcPost(this.endpoint, payload, { ...this.transport, signal });
        if (!out.ok) {
            return { ok: false, isError: false, text: '', failure: out };
        }
        if (signal?.aborted) {
            // The response arrived after the caller aborted: still parse it —
            // the server may have committed — but the controller's generation
            // guard decides whether it counts.
        }
        const result = isRecord(out.result) ? out.result : {};
        const structured = isRecord(result['structuredContent'])
            ? result['structuredContent']
            : undefined;
        const isError = result['isError'] === true;
        const text = Array.isArray(result['content'])
            ? result['content']
                .map((c) => (isRecord(c) && typeof c['text'] === 'string' ? c['text'] : ''))
                .join('\n')
            : '';
        return { ok: true, isError, text, structured };
    }
    /**
     * Discovery — `indy_request_action` with no `actionId`. Returns the
     * projected `interaction` for `actionId`, or `null` when the action is
     * not offerable to this caller / the shape is malformed. A thrown read
     * stays thrown — `loadInteraction` callers decide their own fallback.
     */
    async loadInteraction(actionId, signal) {
        const res = await this.callTool(REQUEST_ACTION_WIRE, {}, signal);
        if (!res.ok)
            return { ok: false, reason: 'transport' };
        if (res.isError || !res.structured)
            return { ok: false, reason: 'unavailable' };
        const status = res.structured['status'];
        if (status !== 'describe')
            return { ok: false, reason: 'unavailable' };
        const actions = Array.isArray(res.structured['actions']) ? res.structured['actions'] : [];
        const hit = actions.find((a) => isRecord(a) && a['actionId'] === actionId);
        if (!hit || !isRecord(hit))
            return { ok: false, reason: 'unknown_action' };
        const interaction = parseActionInteraction(hit['interaction']);
        if (!interaction)
            return { ok: false, reason: 'unavailable' };
        return { ok: true, interaction };
    }
    /**
     * The submit call. `submissionId`/`actionRevision` ride the envelope; the
     * transport's network retries reuse the SAME payload, so a timed-out write
     * that is re-attempted lands on the same dedupe key — never a second row.
     */
    async submit(args, signal) {
        return this.callTool(REQUEST_ACTION_WIRE, {
            actionId: args.actionId,
            payload: args.payload,
            ...(args.requesterName ? { requesterName: args.requesterName } : {}),
            ...(args.guestEmail ? { guestEmail: args.guestEmail } : {}),
            ...(args.note ? { note: args.note } : {}),
            ...(args.callerLocale ? { callerLocale: args.callerLocale } : {}),
            submissionId: args.submissionId,
            ...(args.actionRevision ? { actionRevision: args.actionRevision } : {}),
        }, signal);
    }
}
