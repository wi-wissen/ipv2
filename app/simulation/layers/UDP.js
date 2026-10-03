import { createLog } from '../logging.js';
import { randomPort } from './ports.js';

/**
 * UDP: Verbindungslos. Ein Datagramm wird einfach abgeschickt –
 * ob es ankommt, wird nicht geprüft.
 */
export default class UDP {
    constructor(device) {
        this.device = device;
        this.listeners = new Map(); // Port -> Handler
        this.log = createLog(device, 'transport', 'UDP');
    }

    /**
     * Öffnet einen Port. Mit Port 0 wird ein freier Port gewählt.
     * Der Handler bekommt (daten, { ip, port, nic }).
     * @returns {number} der geöffnete Port
     */
    listen(port, handler) {
        const actual = port || randomPort(this.listeners);
        this.listeners.set(actual, handler);
        return actual;
    }

    close(port) {
        this.listeners.delete(port);
    }

    send(data, destination, destinationPort, { sourcePort, nic } = {}) {
        const datagram = { sourcePort, destinationPort, data };
        this.log.info(`→ Datagramm an ${destination}:${destinationPort}`, datagram);
        return this.device.internet.send(datagram, 'UDP', destination, { nic });
    }

    receive(datagram, { source, nic }) {
        const handler = this.listeners.get(datagram.destinationPort);
        if (!handler) {
            this.log.debug(`Datagramm an geschlossenen Port ${datagram.destinationPort} verworfen`, datagram);
            return;
        }
        this.log.info(`← Datagramm von ${source}:${datagram.sourcePort}`, datagram);
        handler(datagram.data, { ip: source, port: datagram.sourcePort, nic });
    }
}
