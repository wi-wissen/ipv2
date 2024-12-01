class DHCP {
    constructor(manager) {
        this.manager = manager;
        this.assignedIPs = new Map(); // MAC zu IP Mapping (nur für Server)
        this.availableIPs = []; // Liste verfügbarer IPs (nur für Server)
        this.state = 'INIT'; // Zustandsindikator
        this.pendingRequest = null; // Speichert das aktuelle Promise für die IP-Anfrage


        this.initializeIPPool('10', 5, 254); // IP-Bereich von 10.5 bis 10.254 - allow to use 10.2, 10.3 and 10.4 for dns, gateway and http
        
        this.manager.transport.udp.listen(67, this.receive.bind(this));
        this.manager.transport.udp.listen(68, this.receive.bind(this));
    }

    initializeIPPool(prefix, start, end) {
        for (let i = start; i <= end; i++) {
            this.availableIPs.push(`${prefix}.${i}`);
        }
        this.log(`IP-Pool initialisiert: ${this.availableIPs.length} IPs verfügbar`);
    }

    requestIP() {
        if (this.manager.store.isDhcpServer) {
            return Promise.reject(new Error('Ungültiger Zustand für IP-Anforderung'));
        }

        return new Promise((resolve, reject) => {
            const discoveryMessage = {
                type: 'DHCPDISCOVER',
                transactionId: Math.floor(Math.random() * 0xFFFFFFFF),
                clientMac: this.manager.store.mac
            };

            this.log("Sende DHCPDISCOVER", discoveryMessage);
            this.manager.transport.udp.send(discoveryMessage, '255.255', 67, 68);
            this.state = 'SELECTING';

            this.pendingRequest = { resolve, reject };

            // Timeout nach 10 Sekunden
            setTimeout(() => {
                if (this.pendingRequest) {
                    this.pendingRequest.reject(new Error('DHCP-Anfrage Timeout'));
                    this.pendingRequest = null;
                    this.state = 'INIT';
                }
            }, 10000);
        });
    }

    receive(message, sourceIP, sourcePort) {
        this.log("Empfangene Nachricht", message);

        if (this.manager.store.isDhcpServer) {
            this.handleServerMessage(message, sourceIP, sourcePort);
        } else {
            this.handleClientMessage(message, sourceIP, sourcePort);
        }
    }

    handleServerMessage(message, sourceIP, sourcePort) {
        switch (message.type) {
            case 'DHCPDISCOVER':
                this.sendOffer(message);
                break;
            case 'DHCPREQUEST':
                this.sendAcknowledgement(message);
                break;
            default:
                this.log(`Unerwartete Nachricht für Server: ${message.type}`);
        }
    }

    handleClientMessage(message, sourceIP, sourcePort) {
        switch (message.type) {
            case 'DHCPOFFER':
                if (this.state === 'SELECTING') {
                    this.sendRequest(message);
                    this.state = 'REQUESTING';
                }
                break;
            case 'DHCPACK':
                if (this.state === 'REQUESTING') {
                    this.applyIPConfiguration(message);
                    this.state = 'BOUND';
                    if (this.pendingRequest) {
                        this.pendingRequest.resolve(this.manager.store.ip);
                        this.pendingRequest = null;
                    }
                }
                break;
            default:
                this.log(`Unerwartete Nachricht für Client: ${message.type}`);
        }
    }

    sendOffer(discoverMessage) {
        const offeredIP = this.availableIPs.shift();
        if (!offeredIP) {
            console.error('Keine IP-Adressen mehr verfügbar');
            return;
        }

        const offerMessage = {
            type: 'DHCPOFFER',
            transactionId: discoverMessage.transactionId,
            offeredIP: offeredIP,
            serverIP: this.manager.store.ip,
            subnetMask: '255.255',
            gateway: this.manager.store.gateway,
            dns: this.manager.store.dns,
        };

        this.log("Sende DHCPOFFER", offerMessage);
        this.manager.transport.udp.send(offerMessage, '255.255', 68, 67);
    }

    sendRequest(offerMessage) {
        const requestMessage = {
            type: 'DHCPREQUEST',
            transactionId: offerMessage.transactionId,
            requestedIP: offerMessage.offeredIP,
            serverIP: offerMessage.serverIP,
            clientMac: this.manager.store.mac
        };

        this.log("Sende DHCPREQUEST", requestMessage);
        this.manager.transport.udp.send(requestMessage, '255.255', 67, 68);
    }

    sendAcknowledgement(requestMessage) {
        this.assignedIPs.set(requestMessage.clientMac, requestMessage.requestedIP);

        const ackMessage = {
            type: 'DHCPACK',
            transactionId: requestMessage.transactionId,
            assignedIP: requestMessage.requestedIP,
            subnetMask: '255.255',
            gateway: this.manager.store.gateway,
            dns: this.manager.store.dns,
        };

        this.log("Sende DHCPACK", ackMessage);
        this.manager.transport.udp.send(ackMessage, '255.255', 68, 67);
    }

    applyIPConfiguration(ackMessage) {
        this.manager.store.setIp(ackMessage.assignedIP);
        if(ackMessage.dns != '0.0') this.manager.store.setDns(ackMessage.dns);
        if(ackMessage.gateway != '0.0') this.manager.store.setGateway(ackMessage.gateway);
        this.log(`IP-Konfiguration angewendet. IP: ${ackMessage.assignedIP}`, ackMessage);
    }

    log(msg, data) {
        this.manager.log('application', 'dhcp', msg, data);
    }
}

export default DHCP;