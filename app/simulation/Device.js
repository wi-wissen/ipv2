import { isAssigned } from './address.js';
import NetworkInterface from './NetworkInterface.js';
import IPv2 from './layers/IPv2.js';
import UDP from './layers/UDP.js';
import TCP from './layers/TCP.js';
import DHCP from './layers/DHCP.js';
import DNS from './layers/DNS.js';
import HTTP from './layers/HTTP.js';

export const DEFAULT_OPTIONS = {
    arpTimeout: 3000,
    dhcpTimeout: 5000,
    dnsTimeout: 5000,
    tcpTimeout: 8000,
};

/**
 * Ein simuliertes Gerät mit dem kompletten Schichtenmodell:
 *
 *   Anwendung   DHCP, DNS, HTTP
 *   Transport   UDP, TCP
 *   Internet    IPv2
 *   Netzzugang  Ethernet, ARP, Kabel (je Netzwerkkarte)
 *
 * Die Einstellungen stehen in `config` (in der App der Pinia-Store `device`),
 * Pakete laufen über ein Übertragungsmedium (`medium`, siehe ./media).
 */
export default class Device {
    constructor({ config, medium, ssid = 'default', logger = () => {}, options = {} }) {
        this.config = config;
        this.medium = medium;
        this.ssid = ssid;
        this.logger = logger;
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.started = false;
        this.log = this.log.bind(this);

        this.nics = [];
        this.syncInterfaceCount();

        this.internet = new IPv2(this);
        this.udp = new UDP(this);
        this.tcp = new TCP(this);
        this.transport = { UDP: this.udp, TCP: this.tcp };
        this.dhcp = new DHCP(this);
        this.dns = new DNS(this);
        this.http = new HTTP(this);
    }

    log(entry) {
        this.logger(entry);
    }

    async start() {
        this.started = true;
        this.reconnect();
        this.syncServices();
        if (this.needsDhcp()) {
            await this.requestIp().catch(() => {});
        }
    }

    stop() {
        this.started = false;
        for (const nic of this.nics) nic.physical.detach();
        this.dhcp.setServerEnabled(false);
        this.dns.setServerEnabled(false);
        this.http.setServerEnabled(false);
    }

    needsDhcp() {
        return !isAssigned(this.config.interfaces[0]?.ip) && !this.config.services.dhcp;
    }

    requestIp() {
        return this.dhcp.requestIp();
    }

    ownsIp(ip) {
        return this.nics.some((nic) => nic.ip === ip);
    }

    /** Neue SSID: Alle Netzwerkkarten wechseln in das neue Netz. */
    setSsid(ssid) {
        this.ssid = ssid;
        this.reconnect();
    }

    /** Nach Änderungen an den Netzwerkkarten (Anzahl, Segment) neu verbinden. */
    reconnect() {
        this.syncInterfaceCount();
        if (!this.started) return;
        for (const nic of this.nics) {
            nic.arp.clear();
            nic.physical.attach();
        }
    }

    syncInterfaceCount() {
        const count = this.config.interfaces.length;
        while (this.nics.length > count) this.nics.pop().physical.detach();
        while (this.nics.length < count) this.nics.push(new NetworkInterface(this, this.nics.length));
    }

    /** Startet oder beendet die Serverdienste passend zu `config.services`. */
    syncServices() {
        const { services } = this.config;
        this.dhcp.setServerEnabled(this.started && services.dhcp);
        this.dns.setServerEnabled(this.started && services.dns);
        this.http.setServerEnabled(this.started && services.http);
    }

    /** Leert die ARP-Tabellen, z. B. nachdem sich IP-Adressen geändert haben. */
    clearArpCaches() {
        for (const nic of this.nics) nic.arp.clear();
    }
}
