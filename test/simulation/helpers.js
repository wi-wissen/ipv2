import Device from '../../app/simulation/Device.js';
import { MemoryHub, MemoryMedium } from '../../app/simulation/media/MemoryMedium.js';
import { createConfig } from '../../app/simulation/roles.js';

const FAST = { arpTimeout: 200, dhcpTimeout: 300, dnsTimeout: 300, tcpTimeout: 500 };

/** Baut ein kleines Netz im Arbeitsspeicher auf. */
export function createNetwork() {
    const hub = new MemoryHub();
    const devices = [];

    async function add(role, change = (config) => config, { start = true } = {}) {
        const config = createConfig(role);
        change(config);
        const logs = [];
        const device = new Device({
            config,
            medium: new MemoryMedium(hub),
            ssid: 'test',
            logger: (entry) => logs.push(entry),
            options: FAST,
        });
        device.logs = logs;
        devices.push(device);
        if (start) await device.start();
        return device;
    }

    function stopAll() {
        devices.forEach((device) => device.stop());
    }

    return { hub, add, stopAll };
}

export function messages(device, filter = {}) {
    return device.logs
        .filter((entry) => Object.entries(filter).every(([key, value]) => entry[key] === value))
        .map((entry) => entry.message);
}
