// GENERATED from lib/agent-web/client/submission.ts — do not edit here. Regenerate: node scripts/build-agent-site-client.mjs
/** `sub_` + 32 lowercase hex — WebCrypto entropy; throws when no crypto exists. */
export function mintSubmissionId() {
    const c = globalThis.crypto;
    if (!c)
        throw new Error('secure random unavailable');
    if (typeof c.randomUUID === 'function') {
        return `sub_${c.randomUUID().replace(/-/g, '')}`;
    }
    if (typeof c.getRandomValues === 'function') {
        const bytes = c.getRandomValues(new Uint8Array(16));
        return `sub_${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
    }
    throw new Error('secure random unavailable');
}
const SUBMITTABLE_ERRORS = new Set([
    'rate_limited',
    'backlog_full',
    'transport',
    'unavailable',
]);
/**
 * Client-side mirror of the payload contract — a pre-flight check so an
 * obviously invalid body never reaches the wire. The server remains the
 * authority: this exists to keep the REVIEW step honest, not to authorize.
 */
export function validateDraftValues(interaction, values, envelope) {
    const errors = [];
    const schema = interaction.payloadSchema;
    const required = new Set(schema.required ?? []);
    for (const field of interaction.fields) {
        const value = values[field.name];
        const present = value !== undefined && value !== null && value !== '';
        if (required.has(field.name) || field.required) {
            if (!present) {
                errors.push(`${field.name} is required`);
                continue;
            }
        }
        if (!present)
            continue;
        const prop = schema.properties[field.name];
        if (prop?.type === 'integer') {
            const n = typeof value === 'number' ? value : Number(value);
            if (!Number.isFinite(n) || !Number.isInteger(n)) {
                errors.push(`${field.name} must be a whole number`);
                continue;
            }
            if (prop.minimum !== undefined && n < prop.minimum)
                errors.push(`${field.name} must be at least ${prop.minimum}`);
            if (prop.maximum !== undefined && n > prop.maximum)
                errors.push(`${field.name} must be at most ${prop.maximum}`);
        }
        else if (prop?.type === 'boolean') {
            if (typeof value !== 'boolean')
                errors.push(`${field.name} must be yes or no`);
        }
        else {
            const s = String(value);
            if (prop?.minLength !== undefined && s.length < prop.minLength)
                errors.push(`${field.name} is too short`);
            if (prop?.maxLength !== undefined && s.length > prop.maxLength)
                errors.push(`${field.name} is too long`);
            if (prop?.format === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(s))
                errors.push(`${field.name} must be a date`);
        }
    }
    if (interaction.requiresContact) {
        const email = envelope.guestEmail?.trim() ?? '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push('a reply email address is required');
        }
    }
    return errors;
}
export class SubmissionController {
    constructor(clientFor, bus) {
        this.clientFor = clientFor;
        this.bus = bus;
        this.seq = 0;
        this.drafts = new Map();
    }
    openDraft(action, interaction) {
        const draftKey = `d_${++this.seq}`;
        const values = {};
        for (const f of interaction.fields) {
            if (f.collect === 'prefill' && f.defaultValue !== undefined) {
                values[f.name] = f.defaultValue;
            }
        }
        this.drafts.set(draftKey, {
            action,
            interaction,
            values,
            envelope: {},
            phase: 'editing',
            submissionId: null,
            fieldErrors: [],
            error: null,
            receipt: null,
            generation: 0,
            abort: null,
        });
        this.emit(draftKey);
        return draftKey;
    }
    /** Read-side accessors — private state, addressed by draftKey. */
    getDraft(draftKey) {
        const d = this.drafts.get(draftKey);
        if (!d)
            return null;
        return {
            draftKey,
            actionId: d.action.actionId,
            phase: d.phase,
            values: { ...d.values },
            envelope: { ...d.envelope },
            fieldErrors: [...d.fieldErrors],
            error: d.error,
            receipt: d.receipt,
        };
    }
    /** Update field values. Allowed while the intent is still editable. */
    updateValues(draftKey, values) {
        const d = this.drafts.get(draftKey);
        if (!d || (d.phase !== 'editing' && d.phase !== 'review'))
            return false;
        d.values = { ...d.values, ...values };
        this.returnToEditing(d);
        this.emit(draftKey);
        return true;
    }
    /** Update the envelope (name/email/note). Same editability rule. */
    updateEnvelope(draftKey, envelope) {
        const d = this.drafts.get(draftKey);
        if (!d || (d.phase !== 'editing' && d.phase !== 'review'))
            return false;
        d.envelope = { ...d.envelope, ...envelope };
        this.returnToEditing(d);
        this.emit(draftKey);
        return true;
    }
    /** Any content change invalidates the minted key — a new intent is a new key. */
    returnToEditing(d) {
        d.phase = 'editing';
        d.submissionId = null;
        d.error = null;
        d.fieldErrors = [];
        d.generation += 1;
        d.abort?.abort();
        d.abort = null;
    }
    /**
     * The explicit review gate. Validates against the projected schema; on
     * success the draft is submittable. Server `invalid_payload` refusals also
     * land here by putting the draft back to `editing` with their messages.
     */
    review(draftKey) {
        const d = this.drafts.get(draftKey);
        if (!d || (d.phase !== 'editing' && d.phase !== 'review')) {
            return { ok: false, errors: ['draft is not editable'] };
        }
        const errors = validateDraftValues(d.interaction, d.values, d.envelope);
        d.fieldErrors = errors;
        d.generation += 1;
        d.phase = errors.length === 0 ? 'review' : 'editing';
        this.emit(draftKey);
        return { ok: errors.length === 0, errors };
    }
    /**
     * Send the reviewed intent. Safe to call from 'review', 'unknown' (retry
     * the same key) and retryable 'error' states. Refuses from anywhere else —
     * a double-click on a submitting draft is a no-op, not a second write.
     */
    async submit(draftKey) {
        const d = this.drafts.get(draftKey);
        if (!d)
            return false;
        const canSubmit = d.phase === 'review' ||
            d.phase === 'unknown' ||
            (d.phase === 'error' && d.error !== null && SUBMITTABLE_ERRORS.has(d.error.kind));
        if (!canSubmit)
            return false;
        // Mint once per intent; a retry of the same intent reuses the key.
        d.submissionId ?? (d.submissionId = mintSubmissionId());
        return this.send(draftKey, d, 'submitting');
    }
    /**
     * Status refresh — resends the SAME envelope. The server answers
     * `replayed` with the row's live status, or `created` when the original
     * write genuinely never landed (the 'unknown' case resolving itself).
     * Only meaningful once a key exists; the visible phase is untouched while
     * the check is in flight — a refresh is not a new submission.
     */
    async refreshStatus(draftKey) {
        const d = this.drafts.get(draftKey);
        if (!d || !d.submissionId)
            return false;
        if (d.phase !== 'unknown' && d.phase !== 'receipt')
            return false;
        return this.send(draftKey, d, d.phase);
    }
    /**
     * The shared wire leg. `phaseWhileSending` lets a refresh keep showing
     * the receipt/'unknown' state instead of flashing the submit spinner.
     */
    async send(draftKey, d, phaseWhileSending) {
        const generation = ++d.generation;
        d.phase = phaseWhileSending;
        d.error = null;
        d.abort?.abort();
        d.abort = new AbortController();
        this.emit(draftKey);
        const res = await this.clientFor(d.action.mcpUrl).submit({
            actionId: d.action.actionId,
            payload: d.values,
            requesterName: d.envelope.requesterName ?? null,
            guestEmail: d.envelope.guestEmail ?? null,
            note: d.envelope.note ?? null,
            callerLocale: d.envelope.callerLocale ?? null,
            submissionId: d.submissionId,
            actionRevision: d.interaction.actionRevision,
        }, d.abort.signal);
        const live = this.drafts.get(draftKey);
        if (!live || live.generation !== generation)
            return false; // stale — dropped
        this.applyResult(draftKey, live, res);
        return true;
    }
    /**
     * Re-open the draft after a terminal refusal. Keeps the entered values,
     * drops the dead key — the next submit mints a fresh one. Pass a freshly
     * loaded `interaction` when the refusal was `stale_contract`, so the next
     * review runs against the contract the server will actually enforce.
     */
    reset(draftKey, interaction) {
        const d = this.drafts.get(draftKey);
        if (!d)
            return false;
        if (d.phase !== 'error' && d.phase !== 'unknown' && d.phase !== 'receipt')
            return false;
        if (interaction)
            d.interaction = interaction;
        this.returnToEditing(d);
        d.receipt = null;
        this.emit(draftKey);
        return true;
    }
    /** Abort in-flight work and forget the draft. */
    dispose(draftKey) {
        const d = this.drafts.get(draftKey);
        if (!d)
            return;
        d.generation += 1;
        d.abort?.abort();
        this.drafts.delete(draftKey);
    }
    /** Abort everything — unmount path. */
    disposeAll() {
        for (const key of [...this.drafts.keys()])
            this.dispose(key);
    }
    emit(draftKey) {
        const d = this.drafts.get(draftKey);
        if (!d)
            return;
        this.bus.dispatch({
            type: 'showcase:submission-phase-changed',
            draftKey,
            phase: d.phase,
        });
        if (d.phase === 'receipt') {
            this.bus.dispatch({ type: 'showcase:receipt-ready', draftKey });
        }
    }
    applyResult(draftKey, d, res) {
        if (!res.ok) {
            const f = res.failure;
            if (f?.kind === 'network') {
                // Timeout/abort AFTER the request may have been written: the row's
                // existence is unknown, the key survives — refreshStatus resolves it.
                d.phase = 'unknown';
            }
            else if (f?.kind === 'rate_limited') {
                d.phase = 'error';
                d.error = {
                    kind: 'rate_limited',
                    message: 'Rate limited by the endpoint.',
                    ...(f.retryAfterSec !== undefined ? { retryAfterSec: f.retryAfterSec } : {}),
                };
            }
            else {
                d.phase = 'error';
                d.error = { kind: 'transport', message: f?.kind === 'http' ? `HTTP ${f.status}` : 'The endpoint returned an error.' };
            }
            this.emit(draftKey);
            return;
        }
        const status = res.structured?.['status'];
        if (!res.isError && (status === 'pending' || status === 'auto_approved' || status === 'replayed')) {
            d.phase = 'receipt';
            d.receipt = {
                requestId: String(res.structured?.['requestId'] ?? ''),
                status,
                ...(typeof res.structured?.['currentStatus'] === 'string'
                    ? { currentStatus: res.structured['currentStatus'] }
                    : {}),
                ...(typeof res.structured?.['confirmationUrl'] === 'string'
                    ? { confirmationUrl: res.structured['confirmationUrl'] }
                    : {}),
                ...(typeof res.structured?.['whatHappensNext'] === 'string'
                    ? { whatHappensNext: res.structured['whatHappensNext'] }
                    : {}),
            };
            this.emit(draftKey);
            return;
        }
        // isError — the structured status is the honest refusal vocabulary.
        switch (status) {
            case 'invalid_payload': {
                const errs = res.structured?.['errors'];
                d.phase = 'editing';
                d.fieldErrors = Array.isArray(errs) ? errs.filter((e) => typeof e === 'string') : ['the server rejected this request'];
                break;
            }
            case 'email_required': {
                d.phase = 'editing';
                d.fieldErrors = ['a reply email address is required'];
                break;
            }
            case 'revision_mismatch':
                d.phase = 'error';
                d.error = {
                    kind: 'stale_contract',
                    message: 'This form changed since it was loaded.',
                    ...(typeof res.structured?.['currentRevision'] === 'string'
                        ? { currentRevision: res.structured['currentRevision'] }
                        : {}),
                };
                break;
            case 'auth_required':
                d.phase = 'error';
                d.error = { kind: 'auth_required', message: 'This request needs email verification.' };
                break;
            case 'submission_conflict':
                d.phase = 'error';
                d.error = {
                    kind: 'conflict',
                    message: 'This submission key was already used for different details.',
                    ...(typeof res.structured?.['requestId'] === 'string'
                        ? { requestId: res.structured['requestId'] }
                        : {}),
                };
                break;
            case 'submission_key_expired':
                d.phase = 'error';
                d.error = {
                    kind: 'expired',
                    message: 'This submission key has expired.',
                    ...(typeof res.structured?.['requestId'] === 'string'
                        ? { requestId: res.structured['requestId'] }
                        : {}),
                };
                break;
            case 'backlog_full':
                d.phase = 'error';
                d.error = {
                    kind: 'backlog_full',
                    message: 'This agent has too many pending requests right now.',
                    ...(typeof res.structured?.['retryAfter'] === 'number'
                        ? { retryAfterSec: res.structured['retryAfter'] }
                        : {}),
                };
                break;
            case 'rate_limited':
                d.phase = 'error';
                d.error = {
                    kind: 'rate_limited',
                    message: 'You have reached the request limit for this agent.',
                    ...(typeof res.structured?.['retryAfter'] === 'number'
                        ? { retryAfterSec: res.structured['retryAfter'] }
                        : {}),
                };
                break;
            case 'refused':
            case 'not_supported':
                d.phase = 'error';
                d.error = { kind: 'refused', message: res.text || 'The request was refused.' };
                break;
            default:
                d.phase = 'error';
                d.error = { kind: 'unavailable', message: res.text || 'The request could not be completed.' };
        }
        this.emit(draftKey);
    }
}
