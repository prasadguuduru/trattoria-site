// GENERATED from lib/agent-web/client/dom.ts — do not edit here. Regenerate: node scripts/build-agent-site-client.mjs
const PHASE_COPY = {
    editing: '',
    review: 'Review your request before sending.',
    submitting: 'Sending your request…',
    unknown: 'We could not confirm whether your request reached the agent. ' +
        'Checking again is safe — it will not be sent twice.',
    receipt: '',
    error: '',
};
function fieldInput(doc, field) {
    let input;
    switch (field.type) {
        case 'text':
            input = doc.createElement('textarea');
            break;
        case 'boolean': {
            const el = doc.createElement('input');
            el.type = 'checkbox';
            input = el;
            break;
        }
        case 'integer': {
            const el = doc.createElement('input');
            el.type = 'number';
            el.step = '1';
            if (field.min !== undefined)
                el.min = String(field.min);
            if (field.max !== undefined)
                el.max = String(field.max);
            input = el;
            break;
        }
        case 'date': {
            const el = doc.createElement('input');
            el.type = 'date';
            input = el;
            break;
        }
        default: {
            const el = doc.createElement('input');
            el.type = 'text';
            if (field.max !== undefined)
                el.maxLength = field.max;
            input = el;
        }
    }
    if (field.required && 'required' in input) {
        input.required = true;
    }
    input.setAttribute('name', field.name);
    input.setAttribute('data-field-type', field.type);
    if (field.sensitivity === 'pii' || field.sensitivity === 'sensitive') {
        input.setAttribute('autocomplete', 'off');
    }
    return input;
}
function readInputValue(field, input) {
    switch (field.type) {
        case 'boolean':
            return input.checked;
        case 'integer': {
            const v = input.valueAsNumber;
            return Number.isNaN(v) ? input.value : v;
        }
        default:
            return input.value;
    }
}
/**
 * Mount an actionable form for ONE action on ONE agent. `root` keeps its
 * children until this function returns — a caller that keeps static fallback
 * markup inside `root` should nest it in a sibling/child this mount replaces.
 */
export function mountActionForm(opts) {
    const { root, submissions, bus, action, interaction } = opts;
    const doc = root.ownerDocument;
    const draftKey = submissions.openDraft(action, interaction);
    // ── Form section ────────────────────────────────────────────────────────
    const form = doc.createElement('form');
    form.setAttribute('data-action-form', action.actionId);
    form.noValidate = false;
    const inputFor = new Map();
    for (const field of interaction.fields) {
        const wrap = doc.createElement('div');
        wrap.setAttribute('data-field', field.name);
        const label = doc.createElement('label');
        const input = fieldInput(doc, field);
        const inputId = `${draftKey}-${field.name}`;
        input.setAttribute('id', inputId);
        label.setAttribute('for', inputId);
        label.textContent = field.name + (field.required ? ' *' : '');
        wrap.appendChild(label);
        wrap.appendChild(input);
        if (field.tip) {
            const hint = doc.createElement('small');
            hint.id = `${inputId}-hint`;
            hint.textContent = field.tip;
            input.setAttribute('aria-describedby', hint.id);
            wrap.appendChild(hint);
        }
        inputFor.set(field.name, input);
        const initial = interaction.fields.find((f) => f.name === field.name)?.defaultValue;
        if (field.collect === 'prefill' && initial !== undefined) {
            if (field.type === 'boolean')
                input.checked = initial === true;
            else
                input.value = String(initial);
        }
        form.appendChild(wrap);
    }
    // ── Envelope inputs ──────────────────────────────────────────────────────
    const nameInput = doc.createElement('input');
    nameInput.type = 'text';
    nameInput.name = 'requesterName';
    const nameWrap = labeled(doc, `${draftKey}-name`, 'Your name (optional)', nameInput);
    form.appendChild(nameWrap);
    let emailInput = null;
    if (interaction.requiresContact) {
        emailInput = doc.createElement('input');
        emailInput.type = 'email';
        emailInput.name = 'guestEmail';
        emailInput.required = true;
        emailInput.autocomplete = 'email';
        form.appendChild(labeled(doc, `${draftKey}-email`, 'Your email — the owner replies here *', emailInput));
    }
    const noteInput = doc.createElement('textarea');
    noteInput.name = 'note';
    form.appendChild(labeled(doc, `${draftKey}-note`, 'Anything else for the owner (optional)', noteInput));
    // Local + server field errors land here, in the live region's section.
    const errorList = doc.createElement('ul');
    errorList.setAttribute('data-field-errors', '');
    form.appendChild(errorList);
    const reviewBtn = doc.createElement('button');
    reviewBtn.type = 'button';
    reviewBtn.textContent = 'Review request';
    form.appendChild(reviewBtn);
    // ── Review section ───────────────────────────────────────────────────────
    const reviewPane = doc.createElement('div');
    reviewPane.hidden = true;
    const reviewList = doc.createElement('dl');
    const reviewNote = doc.createElement('p');
    reviewNote.textContent = PHASE_COPY.review;
    const sendBtn = doc.createElement('button');
    sendBtn.type = 'button';
    sendBtn.textContent = 'Send request';
    const editBtn = doc.createElement('button');
    editBtn.type = 'button';
    editBtn.textContent = 'Edit';
    reviewPane.append(reviewNote, reviewList, sendBtn, editBtn);
    // ── Status / receipt / error sections ────────────────────────────────────
    const liveRegion = doc.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('role', 'status');
    liveRegion.tabIndex = -1;
    const sendingPane = doc.createElement('div');
    sendingPane.hidden = true;
    sendingPane.textContent = PHASE_COPY.submitting;
    const unknownPane = doc.createElement('div');
    unknownPane.hidden = true;
    const unknownText = doc.createElement('p');
    unknownText.textContent = PHASE_COPY.unknown;
    const checkBtn = doc.createElement('button');
    checkBtn.type = 'button';
    checkBtn.textContent = 'Check again';
    const retryBtn = doc.createElement('button');
    retryBtn.type = 'button';
    retryBtn.textContent = 'Try sending again';
    unknownPane.append(unknownText, checkBtn, retryBtn);
    const receiptPane = doc.createElement('div');
    receiptPane.hidden = true;
    const receiptText = doc.createElement('p');
    const receiptId = doc.createElement('p');
    const receiptNext = doc.createElement('p');
    const receiptLink = doc.createElement('a');
    receiptPane.append(receiptText, receiptId, receiptNext, receiptLink);
    const errorPane = doc.createElement('div');
    errorPane.hidden = true;
    const errorText = doc.createElement('p');
    const errorRetryBtn = doc.createElement('button');
    errorRetryBtn.type = 'button';
    errorRetryBtn.textContent = 'Try again';
    const errorEditBtn = doc.createElement('button');
    errorEditBtn.type = 'button';
    errorEditBtn.textContent = 'Start over';
    errorPane.append(errorText, errorRetryBtn, errorEditBtn);
    liveRegion.append(sendingPane, unknownPane, receiptPane, errorPane);
    const container = doc.createElement('div');
    container.setAttribute('data-action-runtime', '');
    container.append(form, reviewPane, liveRegion);
    root.appendChild(container);
    // ── Collectors ───────────────────────────────────────────────────────────
    const collectValues = () => {
        const values = {};
        for (const field of interaction.fields) {
            const input = inputFor.get(field.name);
            if (input)
                values[field.name] = readInputValue(field, input);
        }
        return values;
    };
    const collectEnvelope = () => ({
        requesterName: nameInput.value.trim() || undefined,
        ...(emailInput ? { guestEmail: emailInput.value.trim() || undefined } : {}),
        note: noteInput.value.trim() || undefined,
        callerLocale: doc.documentElement.lang || undefined,
    });
    const setDisabled = (disabled) => {
        for (const el of form.querySelectorAll('input, textarea, button')) {
            el.disabled = disabled;
        }
    };
    const renderPhase = (phase) => {
        const snap = submissions.getDraft(draftKey);
        if (!snap)
            return;
        form.hidden = phase !== 'editing';
        reviewPane.hidden = phase !== 'review';
        sendingPane.hidden = phase !== 'submitting';
        unknownPane.hidden = phase !== 'unknown';
        receiptPane.hidden = phase !== 'receipt';
        errorPane.hidden = phase !== 'error';
        setDisabled(phase === 'submitting');
        // Server-side field errors render inside the editing form.
        errorList.replaceChildren();
        for (const msg of snap.fieldErrors) {
            const li = doc.createElement('li');
            li.textContent = msg;
            errorList.appendChild(li);
        }
        if (phase === 'review') {
            reviewList.replaceChildren();
            for (const field of interaction.fields) {
                const dt = doc.createElement('dt');
                dt.textContent = field.name;
                const dd = doc.createElement('dd');
                const v = snap.values[field.name];
                dd.textContent = v === undefined || v === null || v === '' ? '—' : String(v);
                reviewList.append(dt, dd);
            }
            if (snap.envelope.guestEmail) {
                const dt = doc.createElement('dt');
                dt.textContent = 'Reply email';
                const dd = doc.createElement('dd');
                dd.textContent = snap.envelope.guestEmail;
                reviewList.append(dt, dd);
            }
        }
        if (phase === 'receipt' && snap.receipt) {
            const r = snap.receipt;
            receiptText.textContent =
                r.status === 'replayed'
                    ? 'This request was already received — it was not sent twice.'
                    : r.status === 'auto_approved'
                        ? "Your request was recorded and matched the owner's standing rule."
                        : 'Your request was sent to the owner. It is not confirmed yet.';
            receiptId.textContent = `Request ID: ${r.requestId}`;
            receiptNext.textContent = r.currentStatus
                ? `Current status: ${r.currentStatus}.`
                : (r.whatHappensNext ?? '');
            const url = r.confirmationUrl;
            if (url && /^https?:\/\//.test(url)) {
                receiptLink.textContent = 'Track this request';
                receiptLink.href = url;
                receiptLink.rel = 'noopener noreferrer';
                receiptLink.hidden = false;
            }
            else {
                receiptLink.hidden = true;
            }
        }
        if (phase === 'error' && snap.error) {
            errorText.textContent = snap.error.message;
            errorRetryBtn.hidden = !(snap.error.kind === 'rate_limited' ||
                snap.error.kind === 'backlog_full' ||
                snap.error.kind === 'transport' ||
                snap.error.kind === 'unavailable');
            errorEditBtn.textContent =
                snap.error.kind === 'stale_contract' ? 'Reload the form' : 'Start over';
        }
        // Move focus so the outcome is announced/visible to keyboard+SR users.
        if (phase === 'submitting' || phase === 'unknown' || phase === 'receipt' || phase === 'error') {
            liveRegion.focus({ preventScroll: false });
        }
    };
    // ── Wiring ───────────────────────────────────────────────────────────────
    const unsub = bus.subscribe('showcase:submission-phase-changed', (ev) => {
        if (ev.draftKey === draftKey)
            renderPhase(ev.phase);
    });
    const syncInputs = () => {
        submissions.updateValues(draftKey, collectValues());
        submissions.updateEnvelope(draftKey, collectEnvelope());
    };
    reviewBtn.addEventListener('click', () => {
        syncInputs();
        submissions.review(draftKey);
    });
    sendBtn.addEventListener('click', () => {
        void submissions.submit(draftKey);
    });
    editBtn.addEventListener('click', () => {
        // Back to editing keeps values; the phase move is announced via the bus.
        const snap = submissions.getDraft(draftKey);
        if (snap)
            submissions.updateValues(draftKey, { ...snap.values });
    });
    checkBtn.addEventListener('click', () => {
        void submissions.refreshStatus(draftKey);
    });
    retryBtn.addEventListener('click', () => {
        void submissions.submit(draftKey);
    });
    errorRetryBtn.addEventListener('click', () => {
        void submissions.submit(draftKey);
    });
    errorEditBtn.addEventListener('click', () => {
        submissions.reset(draftKey);
    });
    form.addEventListener('submit', (ev) => {
        // Enter-key submission must still pass the review gate.
        ev.preventDefault();
        syncInputs();
        submissions.review(draftKey);
    });
    renderPhase('editing');
    opts.onReady?.();
    return {
        draftKey,
        dispose() {
            unsub();
            submissions.dispose(draftKey);
            container.remove();
        },
    };
}
function labeled(doc, id, labelText, input) {
    const wrap = doc.createElement('div');
    const label = doc.createElement('label');
    input.setAttribute('id', id);
    label.setAttribute('for', id);
    label.textContent = labelText;
    wrap.append(label, input);
    return wrap;
}
