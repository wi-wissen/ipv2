import { createLog } from '../logging.js';

/**
 * Bitübertragung: Das "Kabel" einer Netzwerkkarte.
 * Alle Geräte mit derselben SSID und demselben Netzsegment hängen am selben Kabel.
 */
export default class PhysicalLayer {
    constructor(nic) {
        this.nic = nic;
        this.link = null;
        this.room = null;
        this.log = createLog(nic.device, 'link', 'Kabel');
    }

    get connected() {
        return this.link !== null;
    }

    attach() {
        this.detach();
        const { device } = this.nic;
        this.room = `${device.ssid}/segment-${this.nic.segment}`;
        this.link = device.medium.join(this.room, (frame) => this.receive(frame));
        this.log.debug(`${this.nic.name} ist mit Netzsegment ${this.nic.segment} verbunden`);
    }

    detach() {
        this.link?.leave();
        this.link = null;
    }

    send(frame) {
        if (!this.link) {
            this.log.error(`${this.nic.name} ist mit keinem Netz verbunden`);
            return;
        }
        this.link.send(frame);
    }

    receive(frame) {
        this.nic.ethernet.receive(frame);
    }
}
