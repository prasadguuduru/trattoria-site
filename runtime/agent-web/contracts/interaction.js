// GENERATED from lib/agent-web/contracts/interaction.ts — do not edit here. Regenerate: node scripts/build-agent-site-client.mjs
export const ACTION_INTERACTION_VERSION = 1;
const FIELD_TYPES = new Set(['string', 'text', 'integer', 'date', 'boolean']);
const REVISION_RE = /^ar_[0-9a-f]{40}$/;
function isRecord(v) {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function parseField(raw) {
    if (!isRecord(raw))
        return null;
    if (typeof raw.name !== 'string' || raw.name === '')
        return null;
    if (typeof raw.type !== 'string' || !FIELD_TYPES.has(raw.type))
        return null;
    if (typeof raw.required !== 'boolean')
        return null;
    const out = {
        name: raw.name,
        type: raw.type,
        required: raw.required,
    };
    return {
        ...out,
        ...(typeof raw.collect === 'string' ? { collect: raw.collect } : {}),
        ...(typeof raw.min === 'number' ? { min: raw.min } : {}),
        ...(typeof raw.max === 'number' ? { max: raw.max } : {}),
        ...(typeof raw.tip === 'string' ? { tip: raw.tip } : {}),
        ...(raw.defaultValue !== undefined ? { defaultValue: raw.defaultValue } : {}),
        ...(typeof raw.sensitivity === 'string'
            ? { sensitivity: raw.sensitivity }
            : {}),
        ...(typeof raw.onViolation === 'string'
            ? { onViolation: raw.onViolation }
            : {}),
    };
}
function parsePayloadSchema(raw) {
    if (!isRecord(raw) || raw.type !== 'object' || !isRecord(raw.properties))
        return null;
    const properties = {};
    for (const [name, prop] of Object.entries(raw.properties)) {
        if (!isRecord(prop) || typeof prop.type !== 'string')
            return null;
        if (!['string', 'integer', 'boolean'].includes(prop.type))
            return null;
        properties[name] = prop;
    }
    const required = Array.isArray(raw.required)
        ? raw.required.filter((r) => typeof r === 'string')
        : undefined;
    return { type: 'object', properties, ...(required ? { required } : {}) };
}
/**
 * Strict parse — `null` means "do not render the form". A form built from a
 * half-parsed schema submits against the wrong contract; refusing is cheaper
 * than a rejected write.
 */
export function parseActionInteraction(raw) {
    if (!isRecord(raw))
        return null;
    if (raw.version !== ACTION_INTERACTION_VERSION)
        return null;
    if (typeof raw.actionRevision !== 'string' || !REVISION_RE.test(raw.actionRevision))
        return null;
    if (raw.requiresContact !== true && raw.requiresContact !== false)
        return null;
    const payloadSchema = parsePayloadSchema(raw.payloadSchema);
    if (payloadSchema === null)
        return null;
    if (!isRecord(raw.submission))
        return null;
    const sub = raw.submission;
    if (typeof sub.submit !== 'string' || typeof sub.status !== 'string')
        return null;
    const fields = Array.isArray(raw.fields)
        ? raw.fields.map(parseField).filter((f) => f !== null)
        : [];
    return {
        version: ACTION_INTERACTION_VERSION,
        payloadSchema,
        actionRevision: raw.actionRevision,
        fields,
        requiresContact: raw.requiresContact,
        ...(typeof raw.strategy === 'string' ? { strategy: raw.strategy } : {}),
        ...(Array.isArray(raw.examples)
            ? { examples: raw.examples.filter((e) => typeof e === 'string') }
            : {}),
        ...(raw.responseGuidance !== undefined ? { responseGuidance: raw.responseGuidance } : {}),
        submission: {
            submit: sub.submit,
            status: sub.status,
            ...(typeof sub.followup === 'string' ? { followup: sub.followup } : { followup: '' }),
            ...(typeof sub.payloadArg === 'string' ? { payloadArg: sub.payloadArg } : { payloadArg: 'payload' }),
            ...(Array.isArray(sub.payloadAliases)
                ? { payloadAliases: sub.payloadAliases.filter((a) => typeof a === 'string') }
                : {}),
            ...(typeof sub.submissionId === 'string' ? { submissionId: sub.submissionId } : {}),
            ...(typeof sub.actionRevision === 'string' ? { actionRevision: sub.actionRevision } : {}),
        },
    };
}
