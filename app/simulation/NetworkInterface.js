import { UNASSIGNED_IP, isAssigned, randomMac } from './address.js';
import PhysicalLayer from './layers/PhysicalLayer.js';
import Ethernet from './layers/Ethernet.js';
import ARP from './layers/ARP.js';

/**
 * Eine Netzwerkkarte: Kabel (Bitübertragung), Ethernet und ARP.
 * Die Einstellungen (MAC, IP, Netzsegment) stehen in `device.config.interfaces[index]`.
 */
export default class NetworkInterface {
    constructor(device, index) {
        this.device = device;
        this.index = index;
        this.physical = new PhysicalLayer(this);
        this.ethernet = new Ethernet(this);
        this.arp = new ARP(this);
    }

    get config() {
        return this.device.config.interfaces[this.index];
    }

    get name() {
        return `Netzwerkkarte ${this.index + 1}`;
    }

    get mac() {
        return this.config.mac;
    }

    /** Eigene IP-Adresse oder "0.0", solange keine vergeben ist. */
    get ip() {
        return isAssigned(this.config.ip) ? this.config.ip : UNASSIGNED_IP;
    }

    get segment() {
        return this.config.segment;
    }

    renewMac() {
        this.config.mac = randomMac();
    }
}
