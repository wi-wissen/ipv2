class DNS {
    constructor(manager) {
        this.manager = manager;
        this.port = 53;  // Standard-DNS-Port
        this.pendingQueries = new Map(); // Speichert offene Anfragen
        this.manager.transport.udp.listen(this.port, this.receive.bind(this));
    }

    async send(domain) { // alias
        return await this.lookup(domain);
    }

    receive(data, sourceIP, sourcePort) {
        this.log('Received Data', data);
        if (data.flags.QR === 1) {
            // Es ist eine Antwort
            this.receiveResponse(data, sourceIP, sourcePort);
        } else {
            // Es ist eine Anfrage
            if (this.manager.store.isDnsServer) {
                this.receiveQuery(data, sourceIP, sourcePort);
            } else {
                this.log('Warnung: Client erhielt unerwartete DNS-Anfrage', { sourceIP, sourcePort });
            }
        }
    }

    addRecord(domain, ip) {
        if (!this.manager.store.isDnsServer) {
            this.log('Warnung: Versuch, einen DNS-Eintrag als Client hinzuzufügen');
            return;
        }
        if (this.manager.store.hasDnsRecord(domain)) {
            this.log(`Der Domainname ${domain} existiert bereits. Der alte Eintrag wird überschrieben.`);
        }
        this.manager.store.addDnsRecord(domain.toLowerCase(), ip);
        this.log('DNS-Eintrag hinzugefügt', { domain, ip });
    }

    lookup(domain) {
        const lowerDomain = domain.toLowerCase();
        if (this.manager.store.hasDnsRecord(lowerDomain)) {
            const ip = this.manager.store.dnsRecords[lowerDomain];
            this.log('DNS-Abfrage erfolgreich', { domain: lowerDomain, ip: ip });
            return Promise.resolve(ip);
        } else if (this.manager.store.dns != this.manager.store.ip) {
            return this.resolve(domain.toLowerCase()); // Promise
        }
        else {
            this.log('DNS-Abfrage fehlgeschlagen', { domain: lowerDomain });
            return Promise.reject();
        }
    }

    async receiveQuery(data, sourceIP, sourcePort) {
        this.log('DNS-Anfrage empfangen', { data, sourceIP, sourcePort });
        const response = await this.processQuery(data);
        this.sendResponse(response, sourceIP, sourcePort);
    }

    async processQuery(query) {
        const domain = query.question.name;
        const ip = await this.lookup(domain);
        return {
            id: query.id,
            flags: { QR: 1, AA: 1, RA: 1 },
            question: query.question,
            answer: ip ? [{ name: domain, type: 'A', class: 'IN', ttl: 0, rdata: ip }] : []
        };
    }

    sendResponse(response, destIP, destPort) {
        if (!this.manager.store.isDnsServer) {
            this.log('Fehler: Versuch, eine DNS-Antwort als Client zu senden');
            return;
        }
        this.log('Sende DNS-Antwort', { response, destIP, destPort });
        this.manager.transport.udp.send(response, destIP, destPort, this.port);
    }

    resolve(domain) {
        return new Promise((resolve, reject) => {
            const queryId = Math.floor(Math.random() * 65535);
            const query = {
                id: queryId,
                flags: { QR: 0, RD: 1 },
                question: { name: domain, type: 'A', class: 'IN' }
            };

            this.pendingQueries.set(queryId, { resolve, reject, timestamp: Date.now() });

            this.log('Sende DNS-Abfrage', { query });
            console.log(query, this.manager.store.dns, this.port, this.port);
            this.manager.transport.udp.send(query, this.manager.store.dns, this.port, this.port);

            // Timeout nach 5 Sekunden
            setTimeout(() => {
                if (this.pendingQueries.has(queryId)) {
                    const { reject } = this.pendingQueries.get(queryId);
                    this.pendingQueries.delete(queryId);
                    reject(new Error('DNS-Anfrage Timeout'));
                }
            }, 5000);
        });
    }

    receiveResponse(response, sourceIP, sourcePort) {
        this.log('DNS-Antwort empfangen', response);

        const pendingQuery = this.pendingQueries.get(response.id);
        if (pendingQuery) {
            const { resolve } = pendingQuery;
            this.pendingQueries.delete(response.id);

            if (response.answer && response.answer.length > 0) {
                resolve(response.answer[0].rdata); // IP-Adresse
            } else {
                resolve(null); // Keine Antwort gefunden
            }
        } else {
            this.log('Warnung: Unerwartete oder verspätete DNS-Antwort erhalten', response);
        }
    }

    log(msg, data) {
        console.log(`DNS ${this.manager.store.isDnsServer ? 'Server' : 'Client'}: ${msg}`, data);
    }
}

export default DNS;