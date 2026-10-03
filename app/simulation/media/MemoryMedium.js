// Übertragungsmedium im Arbeitsspeicher. Alle Geräte, die denselben Hub
// verwenden, teilen sich die "Kabel". Wird in den Tests verwendet.

export class MemoryHub {
    constructor() {
        this.rooms = new Map();
    }

    subscribe(room, listener) {
        if (!this.rooms.has(room)) this.rooms.set(room, new Set());
        this.rooms.get(room).add(listener);
        return () => this.rooms.get(room)?.delete(listener);
    }

    publish(room, frame, sender) {
        // Wie auf der Leitung: Das Paket wird serialisiert und kommt asynchron an.
        const wire = JSON.stringify(frame);
        for (const listener of this.rooms.get(room) ?? []) {
            if (listener === sender) continue;
            setTimeout(() => listener(JSON.parse(wire)), 0);
        }
    }
}

export class MemoryMedium {
    constructor(hub) {
        this.hub = hub;
        this.name = 'memory';
    }

    async connect() {}

    join(room, onFrame) {
        const listener = (frame) => onFrame(frame);
        const unsubscribe = this.hub.subscribe(room, listener);
        return {
            send: (frame) => this.hub.publish(room, frame, listener),
            leave: unsubscribe,
        };
    }

    close() {}
}
