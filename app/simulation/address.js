// Adressen im vereinfachten Netzwerk.
//
// IPv2-Adressen bestehen aus zwei Zahlen: "Netz.Host", z. B. "10.5".
// Der erste Teil benennt das Netz, der zweite das Gerät in diesem Netz.
// MAC-Adressen bestehen aus drei Hex-Bytes, z. B. "3F:A0:7C".

export const UNASSIGNED_IP = '0.0';
export const BROADCAST_IP = '255.255';
export const BROADCAST_MAC = 'FF:FF:FF';

const IP_PATTERN = /^(\d{1,3})\.(\d{1,3})$/;
const MAC_PATTERN = /^[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}$/;

export function parseIp(ip) {
    const match = IP_PATTERN.exec(String(ip ?? '').trim());
    if (!match) return null;
    const network = Number(match[1]);
    const host = Number(match[2]);
    if (network > 255 || host > 255) return null;
    return { network, host };
}

/** Gültige Geräteadresse: Netz 1–254, Host 1–254. */
export function isValidIp(ip) {
    const parsed = parseIp(ip);
    return parsed !== null
        && parsed.network >= 1 && parsed.network <= 254
        && parsed.host >= 1 && parsed.host <= 254;
}

export function isAssigned(ip) {
    return isValidIp(ip);
}

export function networkOf(ip) {
    return parseIp(ip)?.network ?? null;
}

export function hostOf(ip) {
    return parseIp(ip)?.host ?? null;
}

export function sameNetwork(a, b) {
    const netA = networkOf(a);
    return netA !== null && netA === networkOf(b);
}

/** "255.255" (an alle) oder "<Netz>.255" (an alle im Netz). */
export function isBroadcast(ip) {
    return hostOf(ip) === 255;
}

export function makeIp(network, host) {
    return `${network}.${host}`;
}

export function isValidMac(mac) {
    return MAC_PATTERN.test(String(mac ?? ''));
}

export function randomMac(random = Math.random) {
    const byte = () => Math.floor(random() * 256).toString(16).toUpperCase().padStart(2, '0');
    let mac;
    do {
        mac = `${byte()}:${byte()}:${byte()}`;
    } while (mac === BROADCAST_MAC);
    return mac;
}
