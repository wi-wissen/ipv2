import { afterEach, describe, expect, it } from 'vitest';
import { parseUrl } from '../../app/simulation/layers/HTTP.js';
import { createNetwork, messages } from './helpers.js';

let network;

afterEach(() => network?.stopAll());

describe('Netzzugang', () => {
    it('ARP findet die MAC-Adresse eines Nachbarn und merkt sie sich', async () => {
        network = createNetwork();
        const a = await network.add('dns');
        const b = await network.add('http');

        const mac = await a.nics[0].arp.resolve('10.4');

        expect(mac).toBe(b.nics[0].mac);
        expect(a.nics[0].arp.table()).toEqual([{ ip: '10.4', mac }]);
        expect(b.nics[0].arp.table()).toEqual([{ ip: '10.3', mac: a.nics[0].mac }]);
    });

    it('ARP meldet einen Fehler, wenn niemand die IP hat', async () => {
        network = createNetwork();
        const a = await network.add('dns');

        await expect(a.nics[0].arp.resolve('10.99')).rejects.toThrow('nicht erreichbar');
    });

    it('Ethernet ignoriert Rahmen für andere MAC-Adressen', async () => {
        network = createNetwork();
        const a = await network.add('dns');
        const b = await network.add('http');
        const c = await network.add('dhcp');

        await a.nics[0].arp.resolve('10.4');
        a.nics[0].ethernet.send({ hello: true }, 'TEST', b.nics[0].mac);
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(messages(c, { level: 'debug' })).toContain(`Rahmen für ${b.nics[0].mac} ignoriert (nicht für mich)`);
        expect(messages(b, { level: 'error' })).toContain('Unbekannter Rahmentyp „TEST“');
    });

    it('erkennt doppelte MAC-Adressen und erzeugt eine neue', async () => {
        network = createNetwork();
        const a = await network.add('dns');
        const clone = await network.add('http', (config) => {
            config.interfaces[0].mac = a.config.interfaces[0].mac;
        });
        const oldMac = clone.nics[0].mac;

        clone.nics[0].arp.resolve('10.3').catch(() => {});
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(a.nics[0].mac).not.toBe(oldMac);
    });

    it('meldet IP-Adresskonflikte', async () => {
        network = createNetwork();
        const a = await network.add('dns');
        const b = await network.add('http', (config) => { config.interfaces[0].ip = '10.3'; });

        await a.nics[0].arp.resolve('10.99').catch(() => {});

        expect(messages(b, { level: 'error' })).toContain(`IP-Adresskonflikt: ${a.nics[0].mac} benutzt ebenfalls 10.3`);
    });
});

describe('DHCP', () => {
    it('vergibt einem neuen Client IP, Gateway und DNS-Server', async () => {
        network = createNetwork();
        await network.add('dhcp');
        const client = await network.add('client');

        expect(client.config.interfaces[0].ip).toBe('10.100');
        expect(client.config.gateway).toBe('10.1');
        expect(client.config.dns).toBe('10.3');
    });

    it('vergibt verschiedene Adressen und merkt sich Leases', async () => {
        network = createNetwork();
        const server = await network.add('dhcp');
        const a = await network.add('client');
        const b = await network.add('client');

        expect(a.config.interfaces[0].ip).not.toBe(b.config.interfaces[0].ip);
        expect(server.config.dhcp.leases).toEqual({
            [a.nics[0].mac]: a.config.interfaces[0].ip,
            [b.nics[0].mac]: b.config.interfaces[0].ip,
        });

        await a.requestIp();
        expect(a.config.interfaces[0].ip).toBe('10.100');
    });

    it('meldet, wenn der Adressbereich erschöpft ist', async () => {
        network = createNetwork();
        const server = await network.add('dhcp', (config) => {
            config.dhcp.rangeStart = 100;
            config.dhcp.rangeEnd = 100;
        });
        await network.add('client');
        const second = await network.add('client');

        expect(second.config.interfaces[0].ip).toBe('');
        expect(messages(server, { level: 'error' })).toContain('Keine freie IP-Adresse mehr im Adressbereich');
    });

    it('scheitert ohne DHCP-Server mit einer Zeitüberschreitung', async () => {
        network = createNetwork();
        const client = await network.add('client', () => {}, { start: false });
        client.started = true;
        client.reconnect();

        await expect(client.requestIp()).rejects.toThrow('Zeitüberschreitung');
    });

    it('nimmt bei zwei Servern nur ein Angebot an', async () => {
        network = createNetwork();
        const first = await network.add('dhcp');
        const second = await network.add('dhcp', (config) => {
            config.interfaces[0].ip = '10.5';
            config.dhcp.rangeStart = 150;
        });
        const client = await network.add('client');

        const leases = [first, second].flatMap((s) => Object.values(s.config.dhcp.leases));
        expect(leases).toEqual([client.config.interfaces[0].ip]);
    });
});

describe('DNS', () => {
    it('löst Namen über den DNS-Server auf', async () => {
        network = createNetwork();
        await network.add('dns');
        await network.add('dhcp');
        const client = await network.add('client');

        await expect(client.dns.lookup('WWW.local')).resolves.toBe('10.4');
    });

    it('meldet unbekannte Namen', async () => {
        network = createNetwork();
        await network.add('dns');
        await network.add('dhcp');
        const client = await network.add('client');

        await expect(client.dns.lookup('gibtsnicht.local')).rejects.toThrow('unbekannt');
    });

    it('gibt IP-Adressen unverändert zurück', async () => {
        network = createNetwork();
        const client = await network.add('client', () => {}, { start: false });

        await expect(client.dns.lookup('10.4')).resolves.toBe('10.4');
    });

    it('scheitert ohne eingetragenen DNS-Server', async () => {
        network = createNetwork();
        const client = await network.add('http', (config) => { config.dns = ''; });

        await expect(client.dns.lookup('www.local')).rejects.toThrow('Kein DNS-Server');
    });

    it('fragt bei unbekannten Namen den nächsten DNS-Server (rekursiv)', async () => {
        network = createNetwork();
        await network.add('dns', (config) => {
            config.dns = '10.6';
        });
        await network.add('dns', (config) => {
            config.interfaces[0].ip = '10.6';
            config.dnsRecords = { 'extern.local': '10.77' };
        });
        const client = await network.add('http');

        await expect(client.dns.lookup('extern.local')).resolves.toBe('10.77');
    });
});

describe('TCP', () => {
    it('baut eine Verbindung mit Drei-Wege-Handshake auf und wieder ab', async () => {
        network = createNetwork();
        const server = await network.add('http', (config) => { config.services.http = false; });
        const client = await network.add('dns');
        server.tcp.listen(7, (data) => `Echo: ${data}`);

        await expect(client.tcp.request('10.4', 7, 'Hallo')).resolves.toBe('Echo: Hallo');
        await new Promise((resolve) => setTimeout(resolve, 20));

        const sent = (device) => device.logs
            .filter((e) => e.protocol === 'TCP' && e.message.startsWith('→'))
            .map((e) => e.data.flags.join(','));
        expect(sent(client)).toEqual(['SYN', 'ACK', 'PSH,ACK', 'FIN,ACK', 'ACK']);
        expect(sent(server)).toEqual(['SYN,ACK', 'PSH,ACK', 'FIN,ACK']);
        expect(client.tcp.connections.size).toBe(0);
        expect(server.tcp.connections.size).toBe(0);
    });

    it('zählt Sequenz- und Bestätigungsnummern mit', async () => {
        network = createNetwork();
        const server = await network.add('http', (config) => { config.services.http = false; });
        const client = await network.add('dns');
        server.tcp.listen(7, () => 'ok');

        await client.tcp.request('10.4', 7, 'x');
        await new Promise((resolve) => setTimeout(resolve, 20));

        const segments = (device) => device.logs
            .filter((e) => e.protocol === 'TCP' && e.message.startsWith('→'))
            .map((e) => e.data);
        const [syn, ack] = segments(client);
        const [synAck] = segments(server);
        expect(synAck.ack).toBe(syn.seq + 1);
        expect(ack.seq).toBe(syn.seq + 1);
        expect(ack.ack).toBe(synAck.seq + 1);
    });

    it('wird bei geschlossenem Port mit RST abgelehnt', async () => {
        network = createNetwork();
        await network.add('http', (config) => { config.services.http = false; });
        const client = await network.add('dns');

        await expect(client.tcp.request('10.4', 80, 'GET')).rejects.toThrow('abgelehnt');
    });
});

describe('HTTP', () => {
    it('zerlegt URLs', () => {
        expect(parseUrl('www.local')).toEqual({ host: 'www.local', port: 80, path: '/' });
        expect(parseUrl('http://10.4:8080/a/b')).toEqual({ host: '10.4', port: 8080, path: '/a/b' });
        expect(parseUrl('WWW.Local/seite.html')).toEqual({ host: 'www.local', port: 80, path: '/seite.html' });
        expect(parseUrl('')).toBeNull();
        expect(parseUrl('a b')).toBeNull();
    });

    it('lädt eine Webseite über DNS und TCP', async () => {
        network = createNetwork();
        await network.add('dhcp');
        await network.add('dns');
        await network.add('http');
        const client = await network.add('client');

        const response = await client.http.get('www.local');

        expect(response.status).toBe(200);
        expect(response.ip).toBe('10.4');
        expect(response.body).toContain('Willkommen');
    });

    it('antwortet mit 404 auf unbekannte Pfade', async () => {
        network = createNetwork();
        await network.add('http');
        const client = await network.add('dns');

        const response = await client.http.get('10.4/fehlt');

        expect(response.status).toBe(404);
    });

    it('antwortet mit 405 auf andere Methoden als GET', async () => {
        network = createNetwork();
        await network.add('http');
        const client = await network.add('dns');

        const response = await client.tcp.request('10.4', 80, { method: 'POST', path: '/' });

        expect(response.status).toBe(405);
    });

    it('beendet den Webserver, wenn der Dienst abgeschaltet wird', async () => {
        network = createNetwork();
        const server = await network.add('http');
        const client = await network.add('dns');

        server.config.services.http = false;
        server.syncServices();

        await expect(client.http.get('10.4')).rejects.toThrow('abgelehnt');
    });
});

describe('Router', () => {
    async function twoNetworks() {
        network = createNetwork();
        const router = await network.add('router');
        const web = await network.add('http', (config) => {
            config.interfaces[0].segment = 20;
            config.interfaces[0].ip = '20.4';
            config.gateway = '20.1';
            config.dns = '';
        });
        const client = await network.add('dns', (config) => {
            config.services.dns = false;
        });
        return { router, web, client };
    }

    it('verbindet zwei Netze', async () => {
        const { router, client } = await twoNetworks();

        const response = await client.http.get('20.4');

        expect(response.status).toBe(200);
        expect(messages(router, { level: 'success' }).filter((m) => m.startsWith('Weiterleiten'))).not.toHaveLength(0);
    });

    it('meldet fehlende Routen ohne Gateway', async () => {
        const { client } = await twoNetworks();
        client.config.gateway = '';

        await expect(client.http.get('20.4')).rejects.toThrow('Kein Weg zu 20.4');
    });

    it('leitet nur weiter, wenn die Router-Funktion aktiv ist', async () => {
        const { router, client } = await twoNetworks();
        router.config.services.router = false;

        await expect(client.http.get('20.4')).rejects.toThrow('Zeitüberschreitung');
        expect(messages(router, { level: 'debug' })).toContain('Paket für 20.4 verworfen (nicht für mich)');
    });

    it('verwirft Pakete in Routing-Schleifen (TTL)', async () => {
        network = createNetwork();
        const a = await network.add('router', (config) => {
            config.interfaces = [config.interfaces[0]];
            config.gateway = '10.2';
        });
        const b = await network.add('router', (config) => {
            config.interfaces = [config.interfaces[0]];
            config.interfaces[0].ip = '10.2';
            config.gateway = '10.1';
        });
        const client = await network.add('dns', (config) => { config.gateway = '10.1'; });

        await expect(client.tcp.request('30.1', 80, 'x')).rejects.toThrow('Zeitüberschreitung');
        const errors = [...messages(a, { level: 'error' }), ...messages(b, { level: 'error' })];
        expect(errors.some((m) => m.includes('TTL abgelaufen'))).toBe(true);
    });

    it('vergibt per DHCP Adressen im Netz der jeweiligen Netzwerkkarte', async () => {
        network = createNetwork();
        await network.add('router', (config) => {
            config.services.dhcp = true;
        });
        const client = await network.add('client', (config) => {
            config.interfaces[0].segment = 20;
        });

        // Der Router antwortet über seine zweite Netzwerkkarte (Netz 20).
        expect(client.config.interfaces[0].ip).toBe('20.100');
        expect(client.config.gateway).toBe('20.1');
    });
});

describe('Gerät', () => {
    it('wechselt mit der SSID in ein anderes Netz', async () => {
        network = createNetwork();
        await network.add('http');
        const client = await network.add('dns');

        client.setSsid('anderes-netz');

        await expect(client.nics[0].arp.resolve('10.4')).rejects.toThrow();
    });

    it('wechselt mit dem Netzsegment das Kabel', async () => {
        network = createNetwork();
        await network.add('http');
        const client = await network.add('dns');

        client.config.interfaces[0].segment = 20;
        client.reconnect();

        await expect(client.nics[0].arp.resolve('10.4')).rejects.toThrow();
    });
});
