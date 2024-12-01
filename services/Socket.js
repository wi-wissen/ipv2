import PhysicalLayer from './PhysicalLayer/Index.js';
import Ethernet from './NetworkAccessLayer/Ethernet.js';
import ARP from './NetworkAccessLayer/ARP.js';
import IPv2 from './InternetLayer/IPv2.js';
import TCP from './TransportLayer/TCP.js';
import UDP from './TransportLayer/UDP.js';
import DHCP from './ApplicationLayer/DHCP.js';
import DNS from './ApplicationLayer/DNS.js';
import HTTP from './ApplicationLayer/HTTP.js';

class Socket {
    constructor({ssid, isGatewayServer, isDhcpServer, isDnsServer, isHttpServer, networkStore, sessionStore, logStorage}) {
        this.logs = [];

        this.store = networkStore;
        this.sessionStore = sessionStore;
        this.logStore = logStorage;

        this.ssid = (ssid !== undefined) ?? this.sessionStore.ssid;

        if (isHttpServer !== undefined) {
            this.store.setIsHttpServer(isHttpServer);
            if(isHttpServer) {
                this.store.setIp('10.4'); // preconfig
            }
        }
        if (isDnsServer !== undefined) {
            this.store.setIsDnsServer(isDnsServer);
            if(isDnsServer) {
                this.store.setIp('10.3'); // preconfig
            }
        }
        if (isDhcpServer !== undefined) {
            this.store.setIsDhcpServer(isDhcpServer);
            if(isDhcpServer) {
                this.store.setIp('10.2'); // preconfig
            }
        }        
        if (isGatewayServer !== undefined) {
            this.store.setIsGatewayServer(isHttpServer);
            if(isGatewayServer) {
                this.store.setIp('10.1'); // preconfig
            }
        }

        this.physicalLayer = new PhysicalLayer(this, ssid);
        this.networkAccessLayer = {
            ethernet: new Ethernet(this),
            arp: new ARP(this)
        };
        this.internetLayer = new IPv2(this);
        this.transportLayer = {
            tcp: new TCP(this),
            udp: new UDP(this),
        };
        this.applicationLayer = {
            dhcp: new DHCP(this),
            dns: new DNS(this),
            http: new HTTP(this),
        };

        window.onerror = (message, source, lineno, colno, error) => {
            this.logStore._log('error', 'error', 'error', `${message} in ${source} in line ${lineno}`)
            return true; // do not trigger default browser error handling
        };

        window.addEventListener('unhandledrejection', event => {
            this.logStore._log('error', 'error', 'error', `${event.reason}`);            
            event.preventDefault(); // do not trigger default browser error handling
        });
    }

    async connect() {
        await this.physical.connect();
        console.log(this.store);
        if ((!this.store.ip || this.store.ip == '0.0') && !this.store.isDhcpServer) {
            console.log('requestIP');
            await this.applicationLayer.dhcp.requestIP();
        }
    }

    disconnect() {
        this.physical.disconnet();
    }

    get physical() {
        return this.physicalLayer;
    }

    get network() {
        return this.networkAccessLayer;
    }

    get internet() {
        return this.internetLayer;
    }

    get transport() {
        return this.transportLayer;
    }

    get application() {
        return this.applicationLayer;
    }

    log(layer, protocol, msg, data = {}) {
        this.logStore._log('log', layer, protocol, msg, data);
    }

    error(layer, protocol, msg, data = {}) {
        this.logStore._log('error', layer, protocol, msg, data);
    }

    success(layer, protocol, msg, data = {}) {
        this.logStore._log('success', layer, protocol, msg, data);
    }

    debug(layer, protocol, msg, data = {}) {
        this.logStore._log('debug', layer, protocol, msg, data);
    }
}

export default Socket;