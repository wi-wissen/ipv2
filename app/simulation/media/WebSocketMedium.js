// Übertragungsmedium über den WebSocket-Hub des Nuxt-Servers (server/routes/_ws.js).
// Jedes Netzsegment ist ein "Raum"; der Server verteilt Pakete an alle anderen
// Teilnehmer im selben Raum.

const RECONNECT_DELAY = 2000;

export class WebSocketMedium {
    constructor(url, { timeout = 3000, onStatus = () => {} } = {}) {
        this.url = url;
        this.timeout = timeout;
        this.onStatus = onStatus;
        this.name = 'websocket';
        this.rooms = new Map(); // Raum -> Set von Empfängern
        this.ws = null;
        this.closed = false;
    }

    connect() {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(this.url);
            const timer = setTimeout(() => {
                ws.close();
                reject(new Error(`Keine Verbindung zu ${this.url}`));
            }, this.timeout);

            ws.onopen = () => {
                clearTimeout(timer);
                this.ws = ws;
                for (const room of this.rooms.keys()) this.#emit({ action: 'join', room });
                this.onStatus('connected');
                resolve();
            };
            ws.onerror = () => {
                clearTimeout(timer);
                reject(new Error(`Keine Verbindung zu ${this.url}`));
            };
            ws.onmessage = (event) => this.#receive(event.data);
            ws.onclose = () => {
                if (this.ws !== ws) return;
                this.ws = null;
                if (this.closed) return;
                this.onStatus('disconnected');
                setTimeout(() => this.#reconnect(), RECONNECT_DELAY);
            };
        });
    }

    async #reconnect() {
        if (this.closed) return;
        try {
            await this.connect();
        } catch {
            setTimeout(() => this.#reconnect(), RECONNECT_DELAY);
        }
    }

    #emit(message) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    #receive(raw) {
        let message;
        try {
            message = JSON.parse(raw);
        } catch {
            return;
        }
        for (const listener of this.rooms.get(message.room) ?? []) {
            listener(message.frame);
        }
    }

    join(room, onFrame) {
        if (!this.rooms.has(room)) {
            this.rooms.set(room, new Set());
            this.#emit({ action: 'join', room });
        }
        this.rooms.get(room).add(onFrame);

        return {
            send: (frame) => this.#emit({ action: 'send', room, frame }),
            leave: () => {
                const listeners = this.rooms.get(room);
                listeners?.delete(onFrame);
                if (listeners?.size === 0) {
                    this.rooms.delete(room);
                    this.#emit({ action: 'leave', room });
                }
            },
        };
    }

    close() {
        this.closed = true;
        this.ws?.close();
        this.ws = null;
    }
}
