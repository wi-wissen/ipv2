const DYNAMIC_PORTS_START = 49152;
const DYNAMIC_PORTS_COUNT = 16384;

/** Wählt einen freien Port aus dem Bereich für dynamische Ports (49152–65535). */
export function randomPort(used) {
    let port;
    do {
        port = DYNAMIC_PORTS_START + Math.floor(Math.random() * DYNAMIC_PORTS_COUNT);
    } while (used.has(port));
    return port;
}
