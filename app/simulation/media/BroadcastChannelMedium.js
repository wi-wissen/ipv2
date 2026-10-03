// Übertragungsmedium über die BroadcastChannel-API des Browsers.
// Funktioniert ohne Server, verbindet aber nur Tabs desselben Browsers.

export class BroadcastChannelMedium {
    constructor(prefix = 'ipv2') {
        this.prefix = prefix;
        this.name = 'broadcast-channel';
    }

    async connect() {
        if (typeof BroadcastChannel === 'undefined') {
            throw new Error('BroadcastChannel wird von diesem Browser nicht unterstützt');
        }
    }

    join(room, onFrame) {
        const channel = new BroadcastChannel(`${this.prefix}/${room}`);
        channel.onmessage = (event) => onFrame(event.data);
        return {
            send: (frame) => channel.postMessage(frame),
            leave: () => channel.close(),
        };
    }

    close() {}
}
