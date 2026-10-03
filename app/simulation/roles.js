// Voreinstellungen für die Gerätetypen, die auf der Startseite gewählt werden können.

import { randomMac } from './address.js';

export const ROLES = {
    client: {
        title: 'Client (PC)',
        description: 'Ein Rechner mit Webbrowser. Bekommt seine IP-Adresse automatisch per DHCP.',
    },
    dhcp: {
        title: 'DHCP-Server',
        description: 'Verteilt IP-Adressen, Gateway und DNS-Server an neue Geräte.',
    },
    dns: {
        title: 'DNS-Server',
        description: 'Übersetzt Namen wie „www.local“ in IP-Adressen.',
    },
    http: {
        title: 'Webserver',
        description: 'Liefert Webseiten per HTTP aus.',
    },
    router: {
        title: 'Router',
        description: 'Verbindet zwei Netze miteinander und leitet Pakete weiter.',
    },
};

export function isRole(role) {
    return Object.hasOwn(ROLES, role);
}

function iface(segment, ip = '', mac = randomMac()) {
    return { segment, ip, mac };
}

/**
 * Liefert eine vollständige Gerätekonfiguration für die angegebene Rolle.
 * Die MAC-Adresse der ersten Netzwerkkarte kann übernommen werden,
 * damit ein Gerät beim Rollenwechsel „dieselbe Hardware“ behält.
 */
export function createConfig(role = 'client', { mac } = {}) {
    const config = {
        role,
        interfaces: [iface(10, '', mac)],
        gateway: '',
        dns: '',
        services: { dhcp: false, dns: false, http: false, router: false },
        dhcp: { rangeStart: 100, rangeEnd: 199, leases: {} },
        dnsRecords: {},
        httpPages: {},
    };

    switch (role) {
        case 'dhcp':
            config.interfaces[0].ip = '10.2';
            config.gateway = '10.1';
            config.dns = '10.3';
            config.services.dhcp = true;
            break;
        case 'dns':
            config.interfaces[0].ip = '10.3';
            config.gateway = '10.1';
            config.services.dns = true;
            config.dnsRecords = {
                'dns.local': '10.3',
                'www.local': '10.4',
            };
            break;
        case 'http':
            config.interfaces[0].ip = '10.4';
            config.gateway = '10.1';
            config.dns = '10.3';
            config.services.http = true;
            config.httpPages = {
                '/': '<h1>Willkommen!</h1>\n<p>Diese Seite kommt von meinem Webserver.</p>',
            };
            break;
        case 'router':
            config.interfaces[0].ip = '10.1';
            config.interfaces.push(iface(20, '20.1'));
            config.services.router = true;
            break;
    }

    return config;
}
