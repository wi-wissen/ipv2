import { isAssigned, isValidIp } from '../address.js';
import { createLog } from '../logging.js';

export const PORT = 53;

export function normalizeName(name) {
    return String(name ?? '').trim().toLowerCase().replace(/\.$/, '');
}

/**
 * DNS: Übersetzt Namen in IP-Adressen.
 * Ein DNS-Server beantwortet Anfragen aus seiner Tabelle `config.dnsRecords`.
 * Kennt er einen Namen nicht und hat selbst einen DNS-Server eingetragen,
 * fragt er dort weiter (rekursive Auflösung).
 */
export default class DNS {
    constructor(device) {
        this.device = device;
        this.serverRunning = false;
        this.log = createLog(device, 'application', 'DNS');
    }

    get config() {
        return this.device.config;
    }

    setServerEnabled(enabled) {
        if (enabled === this.serverRunning) return;
        this.serverRunning = enabled;
        if (enabled) {
            this.device.udp.listen(PORT, (message, sender) => this.answer(message, sender));
            this.log.info('DNS-Server gestartet (UDP-Port 53)');
        } else {
            this.device.udp.close(PORT);
            this.log.info('DNS-Server beendet');
        }
    }

    /** Liefert die IP-Adresse zu einem Namen (oder die IP-Adresse selbst). */
    async lookup(name) {
        const domain = normalizeName(name);
        if (isValidIp(domain)) return domain;

        if (this.serverRunning && this.config.dnsRecords[domain]) {
            return this.config.dnsRecords[domain];
        }

        const server = this.config.dns;
        if (!isAssigned(server)) {
            const message = 'Kein DNS-Server eingetragen';
            this.log.error(message);
            throw new Error(message);
        }
        if (this.device.ownsIp(server)) {
            throw new Error(`DNS: Der Name „${domain}“ ist unbekannt`);
        }

        const ip = await this.query(domain, server);
        if (!ip) {
            throw new Error(`DNS: Der Name „${domain}“ ist unbekannt`);
        }
        return ip;
    }

    /** Fragt einen DNS-Server über das Netz. Liefert die IP oder null. */
    query(domain, server) {
        const { udp, options } = this.device;
        const id = Math.floor(Math.random() * 0xFFFF);

        return new Promise((resolve, reject) => {
            const port = udp.listen(0, (message) => {
                if (message.type !== 'response' || message.id !== id) return;
                finish();
                if (message.answer) {
                    this.log.success(`← ${domain} hat die IP-Adresse ${message.answer}`, message);
                } else {
                    this.log.error(`← ${domain} ist unbekannt`, message);
                }
                resolve(message.answer);
            });
            const timer = setTimeout(() => {
                finish();
                this.log.error(`DNS-Server ${server} antwortet nicht`);
                reject(new Error(`DNS: Server ${server} antwortet nicht`));
            }, options.dnsTimeout);
            const finish = () => {
                clearTimeout(timer);
                udp.close(port);
            };

            const message = { type: 'query', id, name: domain };
            this.log.info(`→ Welche IP-Adresse hat ${domain}? (Frage an ${server})`, message);
            udp.send(message, server, PORT, { sourcePort: port }).catch((error) => {
                finish();
                reject(error);
            });
        });
    }

    async answer(message, sender) {
        if (message.type !== 'query') return;
        const domain = normalizeName(message.name);
        this.log.info(`← Anfrage von ${sender.ip}: ${domain}`, message);

        let answer = this.config.dnsRecords[domain] ?? null;
        const upstream = this.config.dns;
        if (!answer && isAssigned(upstream) && !this.device.ownsIp(upstream)) {
            this.log.info(`${domain} steht nicht in meiner Tabelle – frage ${upstream}`);
            answer = await this.query(domain, upstream).catch(() => null);
        }

        const response = { type: 'response', id: message.id, name: domain, answer };
        if (answer) {
            this.log.success(`→ ${domain} = ${answer}`, response);
        } else {
            this.log.error(`→ ${domain} ist unbekannt`, response);
        }
        this.device.udp.send(response, sender.ip, sender.port, { sourcePort: PORT })
            .catch((error) => this.log.error(error.message));
    }
}
