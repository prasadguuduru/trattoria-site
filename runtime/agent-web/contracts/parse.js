// GENERATED from lib/agent-web/contracts/parse.ts — do not edit here. Regenerate: node scripts/build-agent-site-client.mjs
/**
 * Wire validation for the public capability contracts — the ONLY way
 * `unknown` endpoint JSON becomes a `PublicSiteCapabilities` or
 * `NextStepsBlock` a client may trust.
 *
 * BROWSER-SAFE contract (see `./types.ts` header).
 *
 * ── Parsing posture ────────────────────────────────────────────────────────
 *
 * The snapshot is STRICT: a `capabilities` block that fails any field check
 * returns `null`, and `null` means "no options are derivable" — never a
 * partially-trusted snapshot. A missing capability key does NOT fill to
 * `unknown` here; per the contract every key is always emitted, so absence
 * marks the whole block malformed.
 *
 * `nextSteps` is LENIENT per step: a malformed or future-kind step drops
 * out and the rest still parse — an older client must not lose every
 * option because the server learned a new step kind. Clients that can
 * re-derive steps from `capabilities` should prefer that (single source of
 * truth) and use this block only for parity checks.
 *
 * No URL is scheme-checked here — that is each surface's job (marketing
 * runs `sanitizeHttpsUrl` over `links`). This module validates SHAPE only.
 */
import { NEXT_STEPS_VERSION, SITE_CAPABILITY_KEYS, } from './types.js';
function isRecord(v) {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function str(v) {
    return typeof v === 'string' && v.length > 0 ? v : undefined;
}
function parseState(v) {
    if (!isRecord(v))
        return null;
    const s = v['state'];
    return s === 'available' || s === 'unavailable' || s === 'unknown'
        ? Object.freeze({ state: s })
        : null;
}
export function parsePublicSiteCapabilities(value) {
    if (!isRecord(value) || value['version'] !== 1)
        return null;
    const subject = isRecord(value['subject']) ? value['subject'] : null;
    const cardId = subject ? str(subject['cardId']) : undefined;
    if (!subject || !cardId)
        return null;
    const ownerSlug = str(subject['ownerSlug']);
    const capsRaw = isRecord(value['capabilities']) ? value['capabilities'] : null;
    if (!capsRaw)
        return null;
    const capabilities = {};
    for (const key of SITE_CAPABILITY_KEYS) {
        const state = parseState(capsRaw[key]);
        if (!state)
            return null;
        capabilities[key] = state;
    }
    const etn = value['effectiveToolNames'];
    if (etn !== undefined && etn !== null && !(Array.isArray(etn) && etn.every((n) => typeof n === 'string'))) {
        return null;
    }
    const effectiveToolNames = Array.isArray(etn) ? etn : null;
    const checkedAt = str(value['checkedAt']);
    if (!checkedAt)
        return null;
    const linksRaw = value['links'];
    const links = linksRaw === undefined
        ? undefined
        : isRecord(linksRaw)
            ? {
                ...(str(linksRaw['mcpUrl']) ? { mcpUrl: str(linksRaw['mcpUrl']) } : {}),
                ...(str(linksRaw['cardViewUrl']) ? { cardViewUrl: str(linksRaw['cardViewUrl']) } : {}),
                ...(str(linksRaw['agentPageUrl']) ? { agentPageUrl: str(linksRaw['agentPageUrl']) } : {}),
                ...(str(linksRaw['ownerPageUrl']) ? { ownerPageUrl: str(linksRaw['ownerPageUrl']) } : {}),
            }
            : null;
    if (links === null)
        return null;
    const acRaw = value['actionCapabilities'];
    const actionCapabilities = acRaw === undefined
        ? undefined
        : Array.isArray(acRaw)
            ? (() => {
                const out = [];
                for (const a of acRaw) {
                    if (!isRecord(a))
                        return null;
                    const actionId = str(a['actionId']);
                    const submit = parseState(a['submit']);
                    const actionRevision = str(a['actionRevision']);
                    if (!actionId || !submit || !actionRevision)
                        return null;
                    out.push({ actionId, submit, actionRevision });
                }
                return out;
            })()
            : null;
    if (actionCapabilities === null)
        return null;
    const embedOrigin = str(value['embedOrigin']);
    return {
        version: 1,
        subject: {
            cardId,
            ...(ownerSlug ? { ownerSlug } : {}),
        },
        ...(links ? { links } : {}),
        capabilities,
        effectiveToolNames,
        checkedAt,
        ...(actionCapabilities ? { actionCapabilities } : {}),
        ...(embedOrigin ? { embedOrigin } : {}),
    };
}
const STEP_KINDS = new Set(['navigate', 'inspect', 'plan', 'execute']);
function parseStep(v) {
    if (!isRecord(v))
        return null;
    const id = str(v['id']);
    const label = str(v['label']);
    const description = str(v['description']);
    const kind = v['kind'];
    if (!id || !label || !description || typeof kind !== 'string' || !STEP_KINDS.has(kind)) {
        return null;
    }
    const k = kind;
    if (k === 'navigate') {
        const url = str(v['url']);
        return url ? { id, kind: k, label, description, url } : null;
    }
    if (k === 'plan') {
        return { id, kind: k, label, description };
    }
    const tool = str(v['tool']);
    const requiredSelections = v['requiredSelections'];
    if (!tool || !Array.isArray(requiredSelections) || !requiredSelections.every((s) => typeof s === 'string')) {
        return null;
    }
    return { id, kind: k, label, description, tool, requiredSelections };
}
export function parseNextStepsBlock(value) {
    if (!isRecord(value) || value['version'] !== NEXT_STEPS_VERSION)
        return null;
    const stepsRaw = value['steps'];
    if (!Array.isArray(stepsRaw))
        return null;
    const steps = stepsRaw
        .map(parseStep)
        .filter((s) => s !== null);
    return { version: NEXT_STEPS_VERSION, steps };
}
