class ARP {
    constructor(manager) {
        this.manager = manager;
        this.cache = new Map(); // Speichert IP-zu-MAC-Zuordnungen
        this.pendingRequests = new Map(); // Speichert ausstehende ARP-Anfragen
    }

    async resolve(ipAddress) {
        // Prüfen, ob die IP-Adresse bereits im Cache ist
        if (this.cache.has(ipAddress)) {
            return this.cache.get(ipAddress);
        }

        // Wenn eine Anfrage für diese IP bereits läuft, warte auf das Ergebnis
        if (this.pendingRequests.has(ipAddress)) {
            return this.pendingRequests.get(ipAddress);
        }

        // Erstelle eine neue Anfrage
        const request = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(ipAddress);
                reject(new Error('ARP request timed out'));
            }, 10000); // 5 Sekunden Timeout

            const callback = (macAddress) => {
                clearTimeout(timeout);
                this.cache.set(ipAddress, macAddress);
                this.pendingRequests.delete(ipAddress);
                resolve(macAddress);
            };

            this.sendARPRequest(ipAddress, callback);
        });

        return request;
    }

    sendARPRequest(ipAddress, callback) {
        const data = {
            operation: 'request',
            senderIP: this.manager.store.ip,
            senderMAC: this.manager.store.mac,
            targetIP: ipAddress,
            targetMAC: 'FF:FF:FF' // Broadcast
        };

        this.log("Sending data", data);
        this.manager.network.ethernet.send(data, 'ARP', 'FF:FF:FF');
        
        // Speichere den Callback für die spätere Verarbeitung der Antwort
        this.pendingRequests.set(ipAddress, callback);
    }

    receive(data) {
        this.log("Received data", data);
        
        if (data.operation === 'request') {
            if (data.targetIP === this.manager.store.ip) {
                // Wenn wir die Ziel-IP sind, senden wir eine Antwort
                this.sendARPReply(data.senderIP, data.senderMAC);
            }
        } else if (data.operation === 'reply') {
            // Wenn wir eine Antwort erhalten, aktualisieren wir den Cache
            this.cache.set(data.senderIP, data.senderMAC);
            
            // Prüfen, ob wir einen ausstehenden Request für diese IP haben
            const callback = this.pendingRequests.get(data.senderIP);
            if (callback) {
                callback(data.senderMAC); // TODO
                this.pendingRequests.delete(data.senderIP);
            }
        }
    }

    sendARPReply(targetIP, targetMAC) {
        const data = {
            operation: 'reply',
            senderIP: this.manager.store.ip,
            senderMAC: this.manager.store.mac,
            targetIP: targetIP,
            targetMAC: targetMAC
        };

        this.log("Sending ARP reply", data);
        this.manager.network.ethernet.send(data, 'ARP', targetMAC);
    }

    log(msg, data) {
        this.manager.log('network', 'arp', msg, data)
    }
}

export default ARP;