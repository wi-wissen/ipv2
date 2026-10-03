import { BROADCAST_MAC } from '../address.js';
import { createLog } from '../logging.js';

/**
 * Ethernet: Rahmen (Frames) zwischen Netzwerkkarten im selben Netzsegment.
 * Eine Netzwerkkarte nimmt nur Rahmen an, die an ihre MAC-Adresse
 * oder an alle (Broadcast) adressiert sind.
 */
export default class Ethernet {
    constructor(nic) {
        this.nic = nic;
        this.log = createLog(nic.device, 'link', 'Ethernet');
    }

    send(payload, type, destination = BROADCAST_MAC) {
        const frame = {
            source: this.nic.mac,
            destination,
            type,
            payload,
        };
        this.log.info(`→ Rahmen an ${destination === BROADCAST_MAC ? 'alle (Broadcast)' : destination}`, frame);
        this.nic.physical.send(frame);
    }

    receive(frame) {
        if (frame.source === this.nic.mac) {
            // Nur möglich, wenn ein zweites Gerät dieselbe MAC-Adresse hat,
            // z. B. weil ein Browser-Tab dupliziert wurde.
            this.log.error(`MAC-Adresse ${frame.source} ist doppelt vergeben – erzeuge eine neue`, frame);
            this.nic.renewMac();
            return;
        }

        if (frame.destination !== this.nic.mac && frame.destination !== BROADCAST_MAC) {
            this.log.debug(`Rahmen für ${frame.destination} ignoriert (nicht für mich)`, frame);
            return;
        }

        this.log.info(`← Rahmen von ${frame.source}`, frame);

        switch (frame.type) {
            case 'ARP':
                this.nic.arp.receive(frame.payload);
                break;
            case 'IPv2':
                this.nic.device.internet.receive(frame.payload, this.nic);
                break;
            default:
                this.log.error(`Unbekannter Rahmentyp „${frame.type}“`, frame);
        }
    }
}
