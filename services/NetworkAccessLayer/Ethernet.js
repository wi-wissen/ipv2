class Ethernet {
    constructor(manager) {
        this.manager = manager;
    }

    send(data, type = 'IPv2', destinationMac = 'FF:FF:FF') {
        const paket = {
            sourceMac: this.manager.store.mac,
            destinationMac: destinationMac,
            type: type,
            data: data,
        };

        this.log("Sending data", paket);
        this.manager.physical.send(paket, destinationMac);
    }

    receive(data) {
        this.log("Received data", data);

        switch(data.type) {
            case 'IPv2':
                this.manager.internet.receive(data.data);
                break;
            case 'ARP':
                this.manager.network.arp.receive(data.data);
                break;
            default:
                console.error('Unknown protocol type:', data.type);
        }
    }

    log(msg, data) {
        this.manager.log('network', 'ethernet', msg, data)
    }
}

export default Ethernet;