import {
    BROADCAST_IP, BROADCAST_MAC, isAssigned, isBroadcast, sameNetwork,
} from '../address.js';
import { createLog } from '../logging.js';

const DEFAULT_TTL = 16;

/**
 * Internetschicht mit dem vereinfachten Protokoll IPv2.
 * Entscheidet, über welche Netzwerkkarte und an welchen nächsten Empfänger
 * (direkt oder über das Standard-Gateway) ein Paket geschickt wird.
 * Router leiten Pakete, die nicht für sie selbst bestimmt sind, weiter.
 */
export default class IPv2 {
    constructor(device) {
        this.device = device;
        this.log = createLog(device, 'internet', 'IPv2');
    }

    /**
     * Sucht den Weg zu einer Ziel-IP.
     * @returns {{ nic, nextHop }|null}
     */
    route(destination, preferredNic = null) {
        const { nics, config } = this.device;

        if (destination === BROADCAST_IP) {
            return { nic: preferredNic ?? nics[0], nextHop: destination };
        }

        const direct = nics.find((nic) => isAssigned(nic.ip) && sameNetwork(nic.ip, destination));
        if (direct) return { nic: direct, nextHop: destination };

        if (isAssigned(config.gateway)) {
            const nic = nics.find((n) => isAssigned(n.ip) && sameNetwork(n.ip, config.gateway));
            if (nic) return { nic, nextHop: config.gateway };
        }

        return null;
    }

    /**
     * Schickt ein Paket ab. Ist die MAC-Adresse des nächsten Empfängers schon bekannt,
     * geht das Paket sofort los; sonst wird erst per ARP nachgefragt.
     * @returns {Promise} erfüllt, sobald das Paket abgeschickt wurde
     */
    send(data, protocol, destination, { nic: preferredNic } = {}) {
        const route = this.route(destination, preferredNic);
        if (!route) {
            const message = `Kein Weg zu ${destination}: anderes Netz und kein passendes Standard-Gateway`;
            this.log.error(message);
            return Promise.reject(new Error(message));
        }

        const packet = {
            source: route.nic.ip,
            destination,
            protocol,
            ttl: DEFAULT_TTL,
            data,
        };

        if (route.nextHop === destination) {
            this.log.info(`→ Paket an ${destination}`, packet);
        } else {
            this.log.info(`→ Paket an ${destination} über Gateway ${route.nextHop}`, packet);
        }
        return this.transmit(packet, route);
    }

    transmit(packet, { nic, nextHop }) {
        if (isBroadcast(nextHop)) {
            nic.ethernet.send(packet, 'IPv2', BROADCAST_MAC);
            return Promise.resolve();
        }
        const mac = nic.arp.lookup(nextHop);
        if (mac) {
            nic.ethernet.send(packet, 'IPv2', mac);
            return Promise.resolve();
        }
        return nic.arp.resolve(nextHop).then((resolved) => nic.ethernet.send(packet, 'IPv2', resolved));
    }

    isForMe(destination, nic) {
        return destination === BROADCAST_IP
            || this.device.nics.some((n) => isAssigned(n.ip) && n.ip === destination)
            || (isBroadcast(destination) && sameNetwork(destination, nic.ip));
    }

    receive(packet, nic) {
        if (this.isForMe(packet.destination, nic)) {
            this.log.info(`← Paket von ${packet.source}`, packet);
            const transport = this.device.transport[packet.protocol];
            if (!transport) {
                this.log.error(`Unbekanntes Protokoll „${packet.protocol}“`, packet);
                return;
            }
            transport.receive(packet.data, { source: packet.source, destination: packet.destination, nic });
        } else if (this.device.config.services.router && !isBroadcast(packet.destination)) {
            this.forward(packet);
        } else {
            this.log.debug(`Paket für ${packet.destination} verworfen (nicht für mich)`, packet);
        }
    }

    forward(packet) {
        const ttl = packet.ttl - 1;
        if (ttl <= 0) {
            this.log.error(`Paket an ${packet.destination} verworfen: TTL abgelaufen (Routing-Schleife?)`, packet);
            return;
        }

        const route = this.route(packet.destination);
        if (!route) {
            this.log.error(`Router kennt keinen Weg zu ${packet.destination}`, packet);
            return;
        }

        const forwarded = { ...packet, ttl };
        this.log.success(`Weiterleiten: ${packet.source} → ${packet.destination} über ${route.nic.name}`, forwarded);
        this.transmit(forwarded, route).catch((error) => this.log.error(error.message));
    }
}
