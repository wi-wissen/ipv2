import { BroadcastChannelMedium } from './BroadcastChannelMedium.js';
import { WebSocketMedium } from './WebSocketMedium.js';

/** Standardadresse des WebSocket-Hubs: derselbe Server, der die Seite ausliefert. */
export function defaultWebSocketUrl(location) {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${location.host}/_ws`;
}

/**
 * Verbindet sich mit dem WebSocket-Hub. Ist dieser nicht erreichbar
 * (z. B. bei einer rein statischen Veröffentlichung), werden nur die Tabs
 * dieses Browsers über einen BroadcastChannel verbunden.
 */
export async function createMedium({ url, onStatus } = {}) {
    const websocket = new WebSocketMedium(url, { onStatus });
    try {
        await websocket.connect();
        return websocket;
    } catch {
        websocket.close();
        const local = new BroadcastChannelMedium();
        await local.connect();
        return local;
    }
}
