import { createLog } from '../logging.js';
import { randomPort } from './ports.js';

/**
 * TCP: Verbindungsorientiert. Vereinfacht auf das Muster "eine Anfrage, eine Antwort":
 *
 *   Client                          Server
 *   SYN               ──────────►
 *                     ◄──────────   SYN, ACK
 *   ACK               ──────────►
 *   PSH, ACK (Anfrage)──────────►
 *                     ◄──────────   PSH, ACK (Antwort)
 *   FIN, ACK          ──────────►
 *                     ◄──────────   FIN, ACK
 *   ACK               ──────────►
 *
 * Ist auf dem Zielport kein Dienst aktiv, antwortet der Server mit RST.
 */
export default class TCP {
    constructor(device) {
        this.device = device;
        this.listeners = new Map(); // Port -> Handler
        this.connections = new Map(); // Schlüssel -> Connection
        this.log = createLog(device, 'transport', 'TCP');
    }

    /** Der Handler bekommt (anfrage, { ip, port }) und gibt die Antwort zurück (auch als Promise). */
    listen(port, handler) {
        this.listeners.set(port, handler);
    }

    close(port) {
        this.listeners.delete(port);
    }

    static key(localPort, remoteIP, remotePort) {
        return `${localPort}|${remoteIP}:${remotePort}`;
    }

    usedPorts() {
        const ports = new Set(this.listeners.keys());
        for (const connection of this.connections.values()) ports.add(connection.localPort);
        return ports;
    }

    /** Baut eine Verbindung auf, schickt `data` und liefert die Antwort des Servers. */
    request(remoteIP, remotePort, data) {
        const connection = new Connection(this, {
            localPort: randomPort(this.usedPorts()),
            remoteIP,
            remotePort,
        });
        this.connections.set(connection.key, connection);
        return connection.request(data);
    }

    receive(segment, { source }) {
        const key = TCP.key(segment.destinationPort, source, segment.sourcePort);
        let connection = this.connections.get(key);

        if (!connection) {
            if (!(segment.flags.includes('SYN') && !segment.flags.includes('ACK'))) {
                this.log.debug(`Segment ohne passende Verbindung verworfen`, segment);
                return;
            }
            connection = new Connection(this, {
                localPort: segment.destinationPort,
                remoteIP: source,
                remotePort: segment.sourcePort,
            });
            if (!this.listeners.has(segment.destinationPort)) {
                this.log.error(`Verbindungsversuch an geschlossenen Port ${segment.destinationPort} – sende RST`);
                connection.acknowledge(segment);
                connection.send(['RST', 'ACK']);
                return;
            }
            connection.state = 'LISTEN';
            this.connections.set(key, connection);
        }

        this.log.info(`← [${segment.flags.join(', ')}] von ${source}:${segment.sourcePort}`, segment);
        connection.handle(segment);
    }
}

class Connection {
    constructor(tcp, { localPort, remoteIP, remotePort }) {
        this.tcp = tcp;
        this.localPort = localPort;
        this.remoteIP = remoteIP;
        this.remotePort = remotePort;
        this.state = 'CLOSED';
        this.seq = Math.floor(Math.random() * 100000);
        this.ack = 0;
        this.pending = null; // { data, resolve, reject, timer } beim Client
    }

    get key() {
        return TCP.key(this.localPort, this.remoteIP, this.remotePort);
    }

    setState(state) {
        this.tcp.log.debug(`Verbindung ${this.localPort} ↔ ${this.remoteIP}:${this.remotePort}: ${this.state} → ${state}`);
        this.state = state;
    }

    send(flags, data) {
        const segment = {
            sourcePort: this.localPort,
            destinationPort: this.remotePort,
            seq: this.seq,
            ack: this.ack,
            flags,
            data: data ?? null,
        };
        this.seq += segmentLength(segment);
        this.tcp.log.info(`→ [${flags.join(', ')}] an ${this.remoteIP}:${this.remotePort}`, segment);
        this.tcp.device.internet.send(segment, 'TCP', this.remoteIP)
            .catch((error) => this.fail(error));
    }

    /** Merkt sich, bis zu welcher Stelle die Daten der Gegenseite angekommen sind. */
    acknowledge(segment) {
        this.ack = segment.seq + segmentLength(segment);
    }

    request(data) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(
                () => this.fail(new Error(`TCP: Zeitüberschreitung bei der Verbindung zu ${this.remoteIP}:${this.remotePort}`)),
                this.tcp.device.options.tcpTimeout,
            );
            this.pending = { data, resolve, reject, timer };
            this.setState('SYN_SENT');
            this.send(['SYN']);
        });
    }

    handle(segment) {
        const has = (flag) => segment.flags.includes(flag);

        if (has('RST')) {
            this.fail(new Error(`TCP: Verbindung von ${this.remoteIP}:${this.remotePort} abgelehnt (Port geschlossen)`));
            return;
        }

        this.acknowledge(segment);

        switch (this.state) {
            case 'LISTEN':
                if (has('SYN')) {
                    this.setState('SYN_RECEIVED');
                    this.send(['SYN', 'ACK']);
                }
                break;
            case 'SYN_SENT':
                if (has('SYN') && has('ACK')) {
                    this.setState('ESTABLISHED');
                    this.send(['ACK']);
                    this.send(['PSH', 'ACK'], this.pending.data);
                }
                break;
            case 'SYN_RECEIVED':
                if (has('ACK')) this.setState('ESTABLISHED');
                if (segment.data !== null) this.serve(segment.data);
                break;
            case 'ESTABLISHED':
                if (segment.data !== null && this.pending) {
                    this.pending.resolve(segment.data);
                    this.setState('FIN_WAIT');
                    this.send(['FIN', 'ACK']);
                } else if (segment.data !== null) {
                    this.serve(segment.data);
                } else if (has('FIN')) {
                    this.setState('LAST_ACK');
                    this.send(['FIN', 'ACK']);
                }
                break;
            case 'FIN_WAIT':
                if (has('FIN')) {
                    this.send(['ACK']);
                    this.close();
                }
                break;
            case 'LAST_ACK':
                if (has('ACK')) this.close();
                break;
        }
    }

    async serve(data) {
        const handler = this.tcp.listeners.get(this.localPort);
        try {
            const response = await handler(data, { ip: this.remoteIP, port: this.remotePort });
            this.send(['PSH', 'ACK'], response);
        } catch (error) {
            this.tcp.log.error(`Fehler im Dienst auf Port ${this.localPort}: ${error.message}`);
            this.send(['RST']);
            this.close();
        }
    }

    close() {
        this.setState('CLOSED');
        if (this.pending) clearTimeout(this.pending.timer);
        this.tcp.connections.delete(this.key);
    }

    fail(error) {
        if (this.state === 'CLOSED') return;
        this.tcp.log.error(error.message);
        this.pending?.reject(error);
        this.close();
    }
}

/** SYN und FIN zählen wie ein Byte, Daten zählen mit ihrer (JSON-)Länge. */
function segmentLength(segment) {
    let length = segment.data !== null ? JSON.stringify(segment.data).length : 0;
    if (segment.flags.includes('SYN')) length++;
    if (segment.flags.includes('FIN')) length++;
    return length;
}
