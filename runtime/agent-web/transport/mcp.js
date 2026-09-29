// GENERATED from lib/agent-web/transport/mcp.ts — do not edit here. Regenerate: node scripts/build-agent-site-client.mjs
/**
 * Minimal streamable-HTTP MCP client transport — the ONE protocol stack for
 * every browser surface that talks to a card endpoint: the marketing card
 * view consumes it through the generated distribution
 * (`marketing/lib/generated/agent-site/`), and the generated standalone
 * site runtime bundles the same source. There is no second MCP stack.
 *
 * BROWSER-SAFE (see `../contracts/types.ts` header): fetch, AbortSignal and
 * setTimeout only — no Node builtins, no credentials, no cookies. Anonymous
 * requests must call `fetchImpl` with `credentials: 'omit'` semantics; this
 * module never carries a bearer owner credential.
 *
 * Verified wire behavior of /api/agent-web/card/<id>/mcp (2026-09-26):
 *   - every call is POST with `content-type: application/json` and
 *     `accept: application/json, text/event-stream`;
 *   - the server is STATELESS: no `Mcp-Session-Id` is ever returned, so the
 *     header is never required and its absence is never an error;
 *   - responses are PLAIN JSON today. Parse as JSON first and only fall back
 *     to `data:`-line SSE framing when JSON parsing fails (spec requirement,
 *     kept because the transport contract permits SSE).
 *
 * Timeouts: 15s per attempt. Retries: 2 retries with backoff, on NETWORK
 * errors only — a JSON-RPC error or a non-2xx HTTP status is an answer, not
 * a transport failure, and must not be retried.
 */
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRIES = 2;
const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));
function isRecord(v) {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}
/**
 * Turn a response body into a JSON-RPC message. Plain JSON first; on parse
 * failure, treat the body as an SSE stream and take the `data:` payloads.
 * With several events on one stream we prefer the frame whose `id` matches
 * the request; otherwise the last complete frame wins (a stream's terminal
 * message is the response).
 */
export function parseJsonRpcBody(text, requestId) {
    try {
        const parsed = JSON.parse(text);
        return isRecord(parsed) ? parsed : null;
    }
    catch {
        // fall through to SSE
    }
    const frames = [];
    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:'))
            continue;
        const payload = trimmed.slice('data:'.length).trim();
        if (!payload || payload === '[DONE]')
            continue;
        try {
            const parsed = JSON.parse(payload);
            if (isRecord(parsed) && parsed['jsonrpc'] === '2.0')
                frames.push(parsed);
        }
        catch {
            // partial frame — ignore
        }
    }
    if (frames.length === 0)
        return null;
    const matching = requestId == null ? undefined : frames.find((f) => f['id'] === requestId);
    return matching ?? frames[frames.length - 1] ?? null;
}
async function attempt(endpoint, payload, opts) {
    const { fetchImpl, timeoutMs } = opts;
    const callerSignal = opts.signal;
    let res;
    try {
        res = await fetchImpl(endpoint, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                accept: 'application/json, text/event-stream',
            },
            body: JSON.stringify(payload),
            signal: callerSignal
                ? AbortSignal.any([AbortSignal.timeout(timeoutMs), callerSignal])
                : AbortSignal.timeout(timeoutMs),
        });
    }
    catch (err) {
        return { ok: false, kind: 'network', message: err instanceof Error ? err.message : String(err) };
    }
    if (!res.ok) {
        // A 429 is the handshake bucket's refusal (rate-limit.ts → rateLimitDenied)
        // — an ANSWER with a retry-after, not an unreachable host. Mapping it to
        // "couldn't reach" would also arm a retry loop against a hard ceiling.
        if (res.status === 429) {
            const ra = Number(res.headers.get('retry-after'));
            return {
                ok: false,
                kind: 'rate_limited',
                ...(Number.isFinite(ra) && ra > 0 ? { retryAfterSec: ra } : {}),
            };
        }
        return { ok: false, kind: 'http', status: res.status };
    }
    const text = await res.text();
    const id = typeof payload['id'] === 'number' || typeof payload['id'] === 'string'
        ? payload['id']
        : null;
    const msg = parseJsonRpcBody(text, id);
    if (!msg || msg['jsonrpc'] !== '2.0') {
        return { ok: false, kind: 'http', status: res.status };
    }
    if ('error' in msg) {
        const rawErr = msg['error'];
        const error = isRecord(rawErr)
            ? {
                code: typeof rawErr['code'] === 'number' ? rawErr['code'] : 0,
                message: typeof rawErr['message'] === 'string' ? rawErr['message'] : 'unknown',
                ...(rawErr['data'] !== undefined ? { data: rawErr['data'] } : {}),
            }
            : { code: 0, message: String(rawErr) };
        return { ok: false, kind: 'rpc', error };
    }
    return { ok: true, result: msg['result'], raw: msg };
}
/**
 * POST one JSON-RPC message. Retries network failures with exponential
 * backoff (250ms, 500ms). HTTP errors, JSON-RPC errors and parse failures
 * return immediately — retrying them re-spends the caller's read budget for
 * the same refusal.
 */
export async function rpcPost(endpoint, payload, opts = {}) {
    const fetchImpl = opts.fetchImpl ?? fetch;
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const retries = opts.retries ?? DEFAULT_RETRIES;
    const sleep = opts.sleep ?? defaultSleep;
    let last = null;
    for (let i = 0; i <= retries; i++) {
        if (i > 0)
            await sleep(250 * 2 ** (i - 1));
        const out = await attempt(endpoint, payload, { fetchImpl, timeoutMs, sleep, signal: opts.signal });
        if (out.ok || out.kind !== 'network')
            return out;
        // An aborted call must not retry — the cancellation IS the answer.
        if (opts.signal?.aborted)
            return out;
        last = out;
    }
    return last ?? { ok: false, kind: 'network', message: 'unreachable' };
}
/** Fire-and-forget notification (e.g. `notifications/initialized`). Never awaited by callers. */
export function rpcNotify(endpoint, method, opts = {}) {
    const fetchImpl = opts.fetchImpl ?? fetch;
    void fetchImpl(endpoint, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({ jsonrpc: '2.0', method }),
        signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    }).catch(() => {
        // Notifications have no response; a failure here is unactionable by design.
    });
}
