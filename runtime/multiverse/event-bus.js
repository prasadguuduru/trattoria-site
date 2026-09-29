// GENERATED from lib/multiverse/event-bus.ts — do not edit here. Regenerate: node scripts/build-agent-site-client.mjs
export class EventBus {
    constructor() {
        this.listeners = new Map();
    }
    subscribe(type, listener) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type).add(listener);
        return () => {
            this.listeners.get(type)?.delete(listener);
        };
    }
    dispatch(event) {
        this.listeners.get(event.type)?.forEach((fn) => fn(event));
    }
}
