class TCP {
    /**
     * Erstellt eine neue TCP-Instanz.
     * @param {Object} manager - Der Network Manager, der diese TCP-Instanz verwaltet.
     */
    constructor(manager) {
        this.manager = manager;
        this.listeners = new Map(); // Port zu Callback-Mapping
        this.connections = new Map(); // ConnectionKey zu Connection-Objekt-Mapping
        this.usedPorts = new Set();
        this.MSL = 5000; // 5 Sekunden für Maximum Segment Lifetime in der Simulation
    }

    /**
     * Weist einen verfügbaren Port zu oder gibt den angeforderten Port zurück, wenn er verfügbar ist.
     * @param {number} [port=0] - Der gewünschte Port. Wenn 0, wird ein zufälliger Port zugewiesen.
     * @returns {number} Der zugewiesene Port.
     */
    allocatePort(port = 0) {
        this.log("allocate Port", port);
        if (port === 0) {
            // Wähle einen zufälligen Port im Bereich der dynamischen/privaten Ports
            port = 49152 + Math.floor(Math.random() * 16384);
            while (this.usedPorts.has(port)) {
                port = 49152 + Math.floor(Math.random() * 16384);
            }
        }
        this.usedPorts.add(port);
        this.log('Port zugewiesen', port);
        return port;
    }

    /**
     * Gibt einen verwendeten Port frei.
     * @param {number} port - Der freizugebende Port.
     */
    releasePort(port) {
        this.log('Port freigegeben', port);
        this.usedPorts.delete(port);
    }

    /**
     * Startet das Abhören auf einem bestimmten Port.
     * @param {number} port - Der Port, auf dem abgehört werden soll. Wenn 0, wird ein zufälliger Port verwendet.
     * @param {Function} callback - Die Funktion, die bei eingehenden Verbindungen aufgerufen wird.
     * @returns {number} Der tatsächlich verwendete Port.
     */
    listen(port, callback) {
        const newPort = this.allocatePort(port);
        this.log("Listen Port", newPort);
        this.listeners.set(newPort, callback);
        return newPort;
    }

    /**
     * Beendet das Abhören auf einem bestimmten Port.
     * @param {number} port - Der Port, auf dem das Abhören beendet werden soll.
     */
    stopListening(port) {
        this.log("Stop Listening Port", port);
        if (this.listeners.has(port)) {
            this.listeners.delete(port);
            this.releasePort(port);
        }
    }

    /**
     * Sendet Daten an eine bestimmte Zieladresse und Port.
     * Erstellt automatisch eine neue Verbindung, falls keine existiert.
     * @param {*} data - Die zu sendenden Daten
     * @param {number} sourcePort - Der lokale Quellport
     * @param {string} destinationIP - Die Ziel-IP-Adresse
     * @param {number} destinationPort - Der Zielport
     * @returns {Promise<*>} Ein Promise, das mit der Antwort aufgelöst wird
     */
    send(data, sourcePort, destinationIP, destinationPort) {
        return new Promise((resolve, reject) => {
            sourcePort = this.allocatePort(sourcePort);
            const key = `${this.manager.store.ip}:${sourcePort}-${destinationIP}:${destinationPort}`;
            let connection = this.connections.get(key);

            if (!connection) {
                this.log("connect", destinationIP);
                connection = new TCPConnection(this, this.manager.store.ip, sourcePort, destinationIP, destinationPort);
                this.connections.set(key, connection);
            }

            connection.send(data).then(resolve).catch(reject);

            setTimeout(() => {
                if (connection.state != 'CLOSED') {
                    connection.state = 'CLOSED';
                    connection.resolve = null;
                    reject(new Error('TCP-Anfrage Timeout'));
                }
            }, 10000);
        });
    }

    /**
     * Verarbeitet ein eingehendes TCP-Paket.
     * @param {Object} packet - Das eingehende TCP-Paket
     */
    receive(data) {
        this.log("Received data", data);
        const key = `${data.destinationIP}:${data.destinationPort}-${data.sourceIP}:${data.sourcePort}`;
        this.log("key", key);

        let connection = this.connections.get(key);

        //this.log("Connection", connection);

        if (!connection && data.flags.SYN && !data.flags.ACK) {
            // Neue eingehende Verbindung
            connection = new TCPConnection(this, data.destinationIP, data.destinationPort, data.sourceIP, data.sourcePort);
            this.connections.set(key, connection);
        }

        if (connection) {
            connection.handlePacket(data);
        } else {
            this.log("No connection found for packet", key);
        }
    }

    /**
     * Protokolliert eine Nachricht mit zusätzlichen Daten.
     * @param {string} msg - Die zu protokollierende Nachricht.
     * @param {*} data - Zusätzliche zu protokollierende Daten.
     */
    log(msg, data) {
        this.manager.log('transport', 'tcp', msg, data);
    }
}

class TCPConnection {
    /**
     * Erstellt eine neue TCP-Verbindung.
     * @param {TCP} tcp - Die übergeordnete TCP-Instanz.
     * @param {string} localIP - Die lokale IP-Adresse.
     * @param {number} localPort - Der lokale Port.
     * @param {string} remoteIP - Die entfernte IP-Adresse.
     * @param {number} remotePort - Der entfernte Port.
     */
    constructor(tcp, localIP, localPort, remoteIP, remotePort) {
        this.tcp = tcp;
        this.localIP = localIP;
        this.localPort = localPort;
        this.remoteIP = remoteIP;
        this.remotePort = remotePort;
        this.state = 'CLOSED';
        this.sequenceNumber = Math.floor(Math.random() * 4294967295);
        this.acknowledgementNumber = 0;
        this.resolve = null; // resolve promise
        this.sendData = null; // store data to send
    }

    /**
     * Sendet ein TCP-Paket.
     * @param {Object} options - Die Optionen für das zu sendende Paket.
     */
    sendPacket(options) {
        const packet = {
            sourceIP: this.localIP,
            sourcePort: this.localPort,
            destinationIP: this.remoteIP,
            destinationPort: this.remotePort,
            sequenceNumber: this.sequenceNumber,
            acknowledgementNumber: this.acknowledgementNumber,
            flags: {
                SYN: false,
                ACK: false,
                FIN: false,
                ...options.flags
            },
            data: options.data || ''
        };

        this.tcp.log("Sending Data", packet);
        this.tcp.manager.internet.send(packet, 'TCP', this.remoteIP);

        // Aktualisiere die Sequenznummer basierend auf den gesendeten Daten oder Flags
        if (options.data) {
            this.sequenceNumber += options.data.length;
        } else if (options.flags.SYN || options.flags.FIN) {
            this.sequenceNumber++;
        }
    }

    /**
     * Verarbeitet ein eingehendes TCP-Paket.
     * @param {Object} packet - Das eingehende TCP-Paket.
     */
    handlePacket(packet) {
        this.tcp.log('packet', packet);
        this.tcp.log('state', this.state);
        // Vereinfachte Paketverarbeitungslogik
        switch (this.state) {
            case 'CLOSED':
                if (packet.flags.SYN) {
                    this.state = 'ESTABLISHED';
                    this.acknowledgementNumber = packet.sequenceNumber + 1;
                    this.sendPacket({ flags: { SYN: true, ACK: true } });
                }
                // ignore last ACK
                break;
            case 'SYN_SENT':
                if (packet.flags.SYN && packet.flags.ACK) {
                    this.state = 'ESTABLISHED';
                    this.acknowledgementNumber = packet.sequenceNumber + 1;
                    // now we can send our data
                    this.sendPacket({ data: this.sendData, flags: { ACK: true } });
                }
                break;
            case 'ESTABLISHED':
                if (packet.data) {
                    const data = this.receive(packet);
                    this.acknowledgementNumber += packet.data.length;
                    this.sendPacket({ flags: { ACK: true }, data: data });
                }
                if (packet.flags.FIN) {
                    this.state = 'CLOSED'; // regular: CLOSE_WAIT
                    this.acknowledgementNumber++;
                    this.sendPacket({ flags: { ACK: true } });
                }
                break;
            default:
                this.tcp.log('unknown state', {state: this.state, flags: packet.flags});

            this.tcp.log('new state', this.states);
            // Weitere Zustände und Übergänge können nach Bedarf hinzugefügt werden
        }
    }

    /**
     * Sendet Daten über die Verbindung.
     * @param {*} data - Die zu sendenden Daten
     * @returns {Promise<*>} Ein Promise, das mit der Antwort aufgelöst wird
     */
    send(data) {
        return new Promise((resolve, reject) => {
            this.sendData = data;
            this.resolve = resolve; // Speichern des Promise-Resolver für späteren Aufruf

            if (this.state === 'ESTABLISHED') {
                this.sendPacket({ flags: { ACK: true } });
            }
            else if (this.state === 'CLOSED') {
                this.state = 'SYN_SENT';
                this.sendPacket({ flags: { SYN: true } });
            }
            else {
                reject();
            }
        });
    }

    receive(data) {
        console.log(data);
        const listener = this.tcp.listeners.get(data.destinationPort);
        if (listener) {
            return listener(data.data, data.sourceIP, data.sourcePort);
        } else {
            console.warn(`No listener for TCP port ${data.destinationPort}`);
        }

        console.log(this.resolve);

        if(this.resolve) {
            return this.resolve(data.data); // resolve
        }
    }
}

export default TCP;