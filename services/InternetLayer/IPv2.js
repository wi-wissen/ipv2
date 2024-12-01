class IPv2 {
    constructor(manager) {
        this.manager = manager;
    }

    receive(data) {
        this.log("Received data", data);
        if (data.destinationIP === this.manager.store.ip || data.destinationIP.split('.')[1] == 255) {
            switch(data.protocol) {
                case 'UDP':
                    this.manager.transport.udp.receive(data.data);
                    break;
                case 'TCP':
                    this.manager.transport.tcp.receive(data.data);
                    break;
                default:
                    console.error('Unknown IP protocol:', data.protocol);
            }
        } else if (this.manager.store.isGatewayServer) {
            this.send(data.data, protocol, data.destinationIP, data.sourceIP);
        } else {
            console.log('Data is not for this device, discarding');
        }
    }

    async send(data, protocol, destinationIP, sourceIP = null) {
        this.log("Sending data", data);
        console.log(destinationIP);
        if (destinationIP.split('.')[1] == 255) {
            console.log(`Sending ${protocol} packet as Broadcast`);
            this.manager.network.ethernet.send({
                data: data,
                destinationIP: destinationIP,
                sourceIP: sourceIP ?? this.manager.store.ip,
                protocol: protocol,
            }, 'IPv2', 'FF:FF:FF');
        }
        else if (destinationIP == '0.0') {
            this.log(`Sending ${protocol} packet directly to ${destinationIP}`);
            this.manager.network.ethernet.send({
                data: data,
                destinationIP: destinationIP,
                sourceIP: sourceIP ?? this.ip,
                protocol: protocol,
            }, 'IPv2', this.manager.store.mac);
        }
        else if (destinationIP.split('.')[0] == this.manager.store.ip.split('.')[0]) {
            this.log(`Sending ${protocol} packet directly to ${destinationIP}`);
            const destinationMac = await this.manager.network.arp.resolve(destinationIP);
            this.manager.network.ethernet.send({
                data: data,
                destinationIP: destinationIP,
                sourceIP: sourceIP ?? this.ip,
                protocol: protocol,
            }, 'IPv2', destinationMac);
        } else if (this.manager.store.gateway) {
            this.log(`Sending ${protocol} packet to gateway ${this.manager.store.gateway} for ${destinationIP}`);
            const gatewayMac = await this.manager.network.arp.resolve(this.manager.store.gateway);
            this.manager.network.ethernet.send({
                data: data,
                destinationIP: destinationIP,
                sourceIP: sourceIP ?? this.ip,
                protocol: protocol,
            }, 'IPv2', gatewayMac);
        } else {
            this.log('No route to destination and no gateway set', null, 'error');
        }
    }

    log(msg, data = {}, type = 'log') {
        this.manager[type]('ip','ipv2', msg, data)
    }
}

export default IPv2;