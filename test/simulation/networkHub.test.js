import { describe, expect, it, vi } from 'vitest';
import { handleMessage, isValidRoom, MAX_MESSAGE_SIZE } from '../../server/utils/networkHub.js';

function fakePeer() {
    return { subscribe: vi.fn(), unsubscribe: vi.fn(), publish: vi.fn() };
}

describe('WebSocket-Hub', () => {
    it('meldet Browser in Räumen an und ab', () => {
        const peer = fakePeer();
        handleMessage(peer, JSON.stringify({ action: 'join', room: 'KLASSE/segment-10' }));
        handleMessage(peer, JSON.stringify({ action: 'leave', room: 'KLASSE/segment-10' }));

        expect(peer.subscribe).toHaveBeenCalledWith('KLASSE/segment-10');
        expect(peer.unsubscribe).toHaveBeenCalledWith('KLASSE/segment-10');
    });

    it('verteilt Rahmen an den Raum', () => {
        const peer = fakePeer();
        handleMessage(peer, JSON.stringify({ action: 'send', room: 'a/segment-10', frame: { x: 1 } }));

        expect(peer.publish).toHaveBeenCalledWith('a/segment-10', JSON.stringify({ room: 'a/segment-10', frame: { x: 1 } }));
    });

    it('ignoriert ungültige Nachrichten', () => {
        const peer = fakePeer();
        handleMessage(peer, 'kein json');
        handleMessage(peer, 'null');
        handleMessage(peer, JSON.stringify({ action: 'join', room: '<script>' }));
        handleMessage(peer, JSON.stringify({ action: 'send', room: 'a', frame: 'x'.repeat(MAX_MESSAGE_SIZE) }));

        expect(peer.subscribe).not.toHaveBeenCalled();
        expect(peer.publish).not.toHaveBeenCalled();
    });

    it('prüft Raumnamen', () => {
        expect(isValidRoom('KLASSE-7b/segment-20')).toBe(true);
        expect(isValidRoom('')).toBe(false);
        expect(isValidRoom(42)).toBe(false);
        expect(isValidRoom('x'.repeat(101))).toBe(false);
    });
});
