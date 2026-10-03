import { createLog } from '../logging.js';

export const PORT = 80;

const URL_PATTERN = /^(?:http:\/\/)?([^/:?#\s]+)(?::(\d+))?(\/[^\s]*)?$/i;

/** Zerlegt Adressen wie "www.local/seite" oder "http://10.4:80/". */
export function parseUrl(input) {
    const match = URL_PATTERN.exec(String(input ?? '').trim());
    if (!match) return null;
    return {
        host: match[1].toLowerCase(),
        port: match[2] ? Number(match[2]) : PORT,
        path: match[3] || '/',
    };
}

const STATUS_TEXT = {
    200: 'OK',
    404: 'Not Found',
    405: 'Method Not Allowed',
};

function errorPage(status, text) {
    return `<h1>${status} ${STATUS_TEXT[status]}</h1>\n<p>${text}</p>`;
}

/**
 * HTTP: Der Browser fragt eine Seite an (GET), der Webserver antwortet.
 * Die Seiten des Webservers stehen in `config.httpPages` (Pfad -> HTML).
 */
export default class HTTP {
    constructor(device) {
        this.device = device;
        this.serverRunning = false;
        this.log = createLog(device, 'application', 'HTTP');
    }

    setServerEnabled(enabled) {
        if (enabled === this.serverRunning) return;
        this.serverRunning = enabled;
        if (enabled) {
            this.device.tcp.listen(PORT, (request, sender) => this.handle(request, sender));
            this.log.info('Webserver gestartet (TCP-Port 80)');
        } else {
            this.device.tcp.close(PORT);
            this.log.info('Webserver beendet');
        }
    }

    handle(request, sender) {
        this.log.info(`← ${request.method} ${request.path} von ${sender.ip}`, request);

        let response;
        const pages = this.device.config.httpPages;
        if (request.method !== 'GET') {
            response = this.respond(405, errorPage(405, 'Dieser Webserver kann nur GET.'), { Allow: 'GET' });
        } else if (Object.hasOwn(pages, request.path)) {
            response = this.respond(200, pages[request.path]);
        } else {
            response = this.respond(404, errorPage(404, `Die Seite ${request.path} gibt es hier nicht.`));
        }

        const log = response.status === 200 ? this.log.success : this.log.error;
        log(`→ ${response.status} ${response.statusText}`, response);
        return response;
    }

    respond(status, body, headers = {}) {
        return {
            status,
            statusText: STATUS_TEXT[status],
            headers: { 'Content-Type': 'text/html', ...headers },
            body,
        };
    }

    /** Ruft eine Seite ab. Namen werden vorher per DNS aufgelöst. */
    async get(url) {
        const target = parseUrl(url);
        if (!target) throw new Error(`„${url}“ ist keine gültige Adresse`);

        const ip = await this.device.dns.lookup(target.host);
        const request = {
            method: 'GET',
            path: target.path,
            headers: { Host: target.host },
        };
        this.log.info(`→ GET ${target.path} an ${target.host} (${ip})`, request);

        const response = await this.device.tcp.request(ip, target.port, request);
        this.log.success(`← ${response.status} ${response.statusText}`, response);
        return { ...response, ip, url: target };
    }
}
