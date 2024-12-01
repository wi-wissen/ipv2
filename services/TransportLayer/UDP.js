class UDP {
    constructor(manager) {
        this.manager = manager;
        this.listeners = new Map(); // Port zu Callback-Mapping
        this.usedPorts = new Set();
    }

    allocatePort(port = 0) {
        if (port === 0) {
            port = 49152 + Math.floor(Math.random() * 16384);
            while (this.usedPorts.has(port)) {
                port = 49152 + Math.floor(Math.random() * 16384);
            }
        }
        this.usedPorts.add(port);
        this.log('Port zugewiesen', port);
        return port;
    }

    releasePort(port) {
        this.log('Port freigegeben', port);
        this.usedPorts.delete(port);
    }

    send(data, destinationIP, destinationPort, sourcePort) {
        console.log(destinationIP);
        const packet = {
            sourceIP: this.manager.store.ip,
            sourcePort: sourcePort,
            destinationIP: destinationIP,
            destinationPort: destinationPort,
            data: data
        };

        this.log("Sending data", packet);

        this.manager.internet.send(packet, 'UDP', destinationIP);
    }

    receive(data) {
        this.log("Received data", data);
        const listener = this.listeners.get(data.destinationPort);
        if (listener) {
            listener(data.data, data.sourceIP, data.sourcePort);
        } else {
            console.warn(`No listener for UDP port ${data.destinationPort}`);
        }
    }

    listen(port, callback) {
        const newPort = this.allocatePort(port);
        this.log("Listen Port", newPort);
        this.listeners.set(newPort, callback);
        return newPort
    }

    stopListening(port) {
        this.log("Stop Listening Port", port);
        if (this.listeners.has(port)) {
            this.listeners.delete(port);
            this.releasePort(port);
        }
    }

    log(msg, data) {
        this.manager.log('transport','udp', msg, data)
    }
}

export default UDP;