import {
    BROADCAST_IP, isAssigned, makeIp, networkOf,
} from '../address.js';
import { createLog } from '../logging.js';

const SERVER_PORT = 67;
const CLIENT_PORT = 68;

/**
 * DHCP: Ein neues Gerät fragt per Broadcast nach einer IP-Adresse.
 *
 *   Client                    Server
 *   DISCOVER  ──(Broadcast)──►
 *             ◄─(Broadcast)──  OFFER    "Du kannst 10.100 haben"
 *   REQUEST   ──(Broadcast)──►          "Ich nehme 10.100 von 10.2"
 *             ◄─(Broadcast)──  ACK      "10.100 gehört jetzt dir"
 *
 * Vergebene Adressen (Leases) stehen in `config.dhcp.leases` (MAC -> IP).
 */
export default class DHCP {
    constructor(device) {
        this.device = device;
        this.offers = new Map(); // Transaktions-ID -> { mac, ip }
        this.pending = null; // laufende Anfrage des Clients
        this.serverRunning = false;
        this.log = createLog(device, 'application', 'DHCP');

        device.udp.listen(CLIENT_PORT, (message) => this.receiveAsClient(message));
    }

    get config() {
        return this.device.config;
    }

    setServerEnabled(enabled) {
        if (enabled === this.serverRunning) return;
        this.serverRunning = enabled;
        if (enabled) {
            this.device.udp.listen(SERVER_PORT, (message, sender) => this.receiveAsServer(message, sender));
            this.log.info('DHCP-Server gestartet (UDP-Port 67)');
        } else {
            this.device.udp.close(SERVER_PORT);
            this.offers.clear();
            this.log.info('DHCP-Server beendet');
        }
    }

    // ----- Client -----

    /** Fragt per DHCP eine IP-Adresse für die erste Netzwerkkarte an. */
    requestIp() {
        const nic = this.device.nics[0];
        this.pending?.reject(new Error('Neue DHCP-Anfrage gestartet'));

        return new Promise((resolve, reject) => {
            const xid = Math.floor(Math.random() * 0xFFFF);
            const timer = setTimeout(() => {
                this.pending = null;
                this.log.error('Kein DHCP-Server hat geantwortet');
                reject(new Error('DHCP: Zeitüberschreitung'));
            }, this.device.options.dhcpTimeout);

            this.pending = {
                xid,
                nic,
                state: 'SELECTING',
                resolve: (ip) => { clearTimeout(timer); this.pending = null; resolve(ip); },
                reject: (error) => { clearTimeout(timer); this.pending = null; reject(error); },
            };

            nic.config.ip = '';
            const discover = { op: 'DISCOVER', xid, clientMac: nic.mac };
            this.log.info('→ DISCOVER: Gibt es hier einen DHCP-Server?', discover);
            this.sendBroadcast(discover, SERVER_PORT, CLIENT_PORT, nic);
        });
    }

    receiveAsClient(message) {
        const request = this.pending;
        if (!request || message.xid !== request.xid || message.clientMac !== request.nic.mac) return;

        if (message.op === 'OFFER' && request.state === 'SELECTING') {
            this.log.info(`← OFFER: ${message.serverIP} bietet ${message.yourIP} an`, message);
            request.state = 'REQUESTING';
            const answer = {
                op: 'REQUEST',
                xid: request.xid,
                clientMac: request.nic.mac,
                requestedIP: message.yourIP,
                serverIP: message.serverIP,
            };
            this.log.info(`→ REQUEST: Ich nehme ${message.yourIP}`, answer);
            this.sendBroadcast(answer, SERVER_PORT, CLIENT_PORT, request.nic);
        } else if (message.op === 'ACK' && request.state === 'REQUESTING') {
            request.nic.config.ip = message.yourIP;
            this.config.gateway = message.gateway ?? '';
            this.config.dns = message.dns ?? '';
            this.log.success(`← ACK: Meine IP-Adresse ist jetzt ${message.yourIP}`, message);
            request.resolve(message.yourIP);
        } else if (message.op === 'NAK') {
            this.log.error('← NAK: Der DHCP-Server hat die Anfrage abgelehnt', message);
            request.reject(new Error('DHCP: Anfrage abgelehnt'));
        }
    }

    // ----- Server -----

    receiveAsServer(message, { nic }) {
        if (!isAssigned(nic.ip)) {
            this.log.error('DHCP-Server braucht selbst eine feste IP-Adresse');
            return;
        }

        if (message.op === 'DISCOVER') {
            this.offer(message, nic);
        } else if (message.op === 'REQUEST') {
            this.acknowledge(message, nic);
        }
    }

    offer(message, nic) {
        this.log.info(`← DISCOVER von ${message.clientMac}`, message);
        const ip = this.findFreeAddress(message.clientMac, nic);
        if (!ip) {
            this.log.error('Keine freie IP-Adresse mehr im Adressbereich');
            return;
        }
        this.offers.set(message.xid, { mac: message.clientMac, ip });

        const offer = {
            op: 'OFFER',
            xid: message.xid,
            clientMac: message.clientMac,
            yourIP: ip,
            serverIP: nic.ip,
            ...this.options(nic),
        };
        this.log.info(`→ OFFER: ${ip} für ${message.clientMac}`, offer);
        this.sendBroadcast(offer, CLIENT_PORT, SERVER_PORT, nic);
    }

    acknowledge(message, nic) {
        const offer = this.offers.get(message.xid);
        this.offers.delete(message.xid);

        if (message.serverIP !== nic.ip) {
            this.log.debug(`Client hat sich für DHCP-Server ${message.serverIP} entschieden`, message);
            return;
        }

        this.log.info(`← REQUEST von ${message.clientMac} für ${message.requestedIP}`, message);
        const leases = this.config.dhcp.leases;
        const holder = Object.keys(leases).find((mac) => leases[mac] === message.requestedIP);
        const valid = offer?.ip === message.requestedIP && (!holder || holder === message.clientMac);

        if (!valid) {
            const nak = { op: 'NAK', xid: message.xid, clientMac: message.clientMac };
            this.log.error(`→ NAK: ${message.requestedIP} kann nicht vergeben werden`, nak);
            this.sendBroadcast(nak, CLIENT_PORT, SERVER_PORT, nic);
            return;
        }

        leases[message.clientMac] = message.requestedIP;
        const ack = {
            op: 'ACK',
            xid: message.xid,
            clientMac: message.clientMac,
            yourIP: message.requestedIP,
            serverIP: nic.ip,
            ...this.options(nic),
        };
        this.log.success(`→ ACK: ${message.requestedIP} gehört jetzt ${message.clientMac}`, ack);
        this.sendBroadcast(ack, CLIENT_PORT, SERVER_PORT, nic);
    }

    /** Gateway und DNS-Server, die den Clients mitgeteilt werden. */
    options(nic) {
        const { config } = this;
        return {
            gateway: config.gateway || (config.services.router ? nic.ip : ''),
            dns: config.dns || (config.services.dns ? nic.ip : ''),
        };
    }

    findFreeAddress(mac, nic) {
        const network = networkOf(nic.ip);
        const { leases, rangeStart, rangeEnd } = this.config.dhcp;

        if (networkOf(leases[mac]) === network) return leases[mac];

        const used = new Set([
            ...Object.values(leases),
            ...[...this.offers.values()].map((offer) => offer.ip),
            ...this.device.nics.map((n) => n.ip),
            this.config.gateway,
            this.config.dns,
        ]);
        for (let host = Number(rangeStart); host <= Number(rangeEnd); host++) {
            const ip = makeIp(network, host);
            if (!used.has(ip)) return ip;
        }
        return null;
    }

    sendBroadcast(message, destinationPort, sourcePort, nic) {
        this.device.udp.send(message, BROADCAST_IP, destinationPort, { sourcePort, nic })
            .catch((error) => this.log.error(error.message));
    }
}
