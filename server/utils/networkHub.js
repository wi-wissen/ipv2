// Der "Hub" verteilt Ethernet-Rahmen zwischen den Browsern.
// Jedes Netzsegment einer SSID ist ein Raum (z. B. "KLASSE-7B/segment-10").
// Ein Rahmen wird an alle anderen Teilnehmer im selben Raum geschickt –
// genau wie bei einem echten Hub oder einem gemeinsamen Funknetz.

export const MAX_MESSAGE_SIZE = 64 * 1024;
const ROOM_PATTERN = /^[\w\-./]{1,100}$/;

export function isValidRoom(room) {
    return typeof room === 'string' && ROOM_PATTERN.test(room);
}

/** Verarbeitet eine Nachricht eines Browsers (peer im Sinne von crossws). */
export function handleMessage(peer, raw) {
    if (raw.length > MAX_MESSAGE_SIZE) return;

    let message;
    try {
        message = JSON.parse(raw);
    } catch {
        return;
    }
    if (!message || !isValidRoom(message.room)) return;

    switch (message.action) {
        case 'join':
            peer.subscribe(message.room);
            break;
        case 'leave':
            peer.unsubscribe(message.room);
            break;
        case 'send':
            peer.publish(message.room, JSON.stringify({ room: message.room, frame: message.frame }));
            break;
    }
}
