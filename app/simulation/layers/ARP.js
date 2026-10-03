import { BROADCAST_MAC, isAssigned } from '../address.js';
import { createLog } from '../logging.js';

/**
 * ARP: Findet zu einer IP-Adresse im eigenen Netz die passende MAC-Adresse.
 * Gefundene Zuordnungen werden in der ARP-Tabelle (Cache) gespeichert.
 */
export default class ARP {
    constructor(nic) {
        this.nic = nic;
        this.cache = new Map(); // IP -> MAC
        this.pending = new Map(); // IP -> { promise, resolve, reject, timer }
        this.log = createLog(nic.device, 'link', 'ARP');
    }

    /** Bekannte MAC-Adresse zu einer IP (ohne Nachfrage im Netz) oder null. */
    lookup(ip) {
        if (ip === this.nic.ip) return this.nic.mac;
        return this.cache.get(ip) ?? null;
    }

    /** Liefert die MAC-Adresse zu einer IP und fragt dazu notfalls im Netz nach. */
    resolve(ip) {
        const known = this.lookup(ip);
        if (known) return Promise.resolve(known);
        if (this.pending.has(ip)) return this.pending.get(ip).promise;

        const request = {};
        request.promise = new Promise((resolve, reject) => {
            request.resolve = resolve;
            request.reject = reject;
        });
        request.timer = setTimeout(() => {
            this.pending.delete(ip);
            this.log.error(`Keine Antwort: Niemand im Netz hat die IP-Adresse ${ip}`);
            request.reject(new Error(`ARP: ${ip} nicht erreichbar`));
        }, this.nic.device.options.arpTimeout);
        this.pending.set(ip, request);

        const message = {
            operation: 'request',
            senderIP: this.nic.ip,
            senderMAC: this.nic.mac,
            targetIP: ip,
            targetMAC: null,
        };
        this.log.info(`→ Wer hat ${ip}? Bitte an ${this.nic.ip} melden`, message);
        this.nic.ethernet.send(message, 'ARP', BROADCAST_MAC);

        return request.promise;
    }

    receive(message) {
        const ownIp = this.nic.ip;

        if (isAssigned(ownIp) && message.senderIP === ownIp && message.senderMAC !== this.nic.mac) {
            this.log.error(`IP-Adresskonflikt: ${message.senderMAC} benutzt ebenfalls ${ownIp}`, message);
        }

        if (message.operation === 'request') {
            if (message.targetIP !== ownIp || !isAssigned(ownIp)) return;
            this.learn(message.senderIP, message.senderMAC);
            const reply = {
                operation: 'reply',
                senderIP: ownIp,
                senderMAC: this.nic.mac,
                targetIP: message.senderIP,
                targetMAC: message.senderMAC,
            };
            this.log.info(`→ ${ownIp} ist bei ${this.nic.mac}`, reply);
            this.nic.ethernet.send(reply, 'ARP', message.senderMAC);
        } else if (message.operation === 'reply') {
            this.log.success(`← ${message.senderIP} ist bei ${message.senderMAC}`, message);
            this.learn(message.senderIP, message.senderMAC);
        }
    }

    learn(ip, mac) {
        if (!isAssigned(ip)) return;
        this.cache.set(ip, mac);
        const request = this.pending.get(ip);
        if (request) {
            clearTimeout(request.timer);
            this.pending.delete(ip);
            request.resolve(mac);
        }
    }

    clear() {
        this.cache.clear();
    }

    table() {
        return [...this.cache].map(([ip, mac]) => ({ ip, mac }));
    }
}
