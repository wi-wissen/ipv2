import Pusher from 'pusher-js';
import { useRuntimeConfig } from '#app'

class PhysicalLayer {
    constructor(manager) {
        const config = useRuntimeConfig();

        this.manager = manager;
        this._network = 10;
        this.socket = new Pusher(config.public.pusherAppKey, {
            wsHost: config.public.pusherHost,
            wsPort: config.public.pusherPort,
            forceTLS: config.public.pusherForceTLS,
            disableStats: true,
            enabledTransports: ['ws', 'wss'],
            cluster: config.public.pusherHost, // soketi do not need this, but is required by pusher-js
        });
    }

    connect() {
        return new Promise((resolve, reject) => {
            // Überwachen Sie das Verbindungsereignis
            this.socket.connection.bind('connected', () => {
                this.debug('[Pusher] Successfully connected.');
                resolve();
            });

            // Überwachen Sie das Verbindungsschlussereignis
            this.socket.connection.bind('disconnected', () => {
                this.debug('[Pusher] Connection disconnected.');
            });

            // Überwachen Sie das Verbindungsfehlerereignis
            this.socket.connection.bind('error', (err) => {
                const error = `[Pusher] Error ${err.error.data.code}: ${err.error.data.message}`;
                console.error(error);
                reject(new Error(error));
            });

            // Überwachen Sie das Verbindungsschließungsereignis mit Grund
            this.socket.connection.bind('closed', (closeEvent) => {
                this.debug('[Pusher] Connection closed:', closeEvent);
            });

            // Optional: Überwachen Sie die Verbindungssperre
            this.socket.connection.bind('connecting_in', (delay) => {
                this.debug('[Pusher] Attempting to reconnect in ' + delay + ' seconds.');
            });

            this.initializeChannels();
        });
    }

    disconnet() {
        this.leaveChannels();
    }

    get ssid() {
        let ssid = this.manager.sessionStore.ssid;
        if (ssid) {
            this.debug('Retrieved Network SSID address from Storage: ' + ssid);
            return ssid;
        }
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        for (let i = 0; i < 8; i++) {
            ssid += characters.charAt(Math.floor(Math.random() * characters.length))
        }
        this.manager.sessionStore.setSsid(ssid);
        this.debug('Generated new Network SSID: ' + ssid);        
        return ssid
    }

    set ssid(value) {
        this.manager.sessionStore.setSsid(value);
        this.initializeChannels();
        this.manager.success('New Network SSID:', this.ssid);
    }
    
    get macAddress() {;
        if (this.manager.store.mac) {
            this.debug('Retrieved MAC address from Storage: ' + this.manager.store.mac);
            return this.manager.store.mac;
        }
        const newMac = 'XX:XX:XX'.replace(/X/g, () => {
            return '0123456789ABCDEF'.charAt(Math.floor(Math.random() * 16));
        });
        this.manager.store.setMac(newMac);
        this.debug('Generated new MAC address: ' + newMac);
        return newMac;
    }

    get network() {
        return this._network;
    }

    set network(value) {
        this._network = value;
        this.initializeChannels();
    }

    leaveChannels() {
        if (this.networkChannel) {
            this.socket.unsubscribe(this.networkChannel.name);
        }
        if (this.deviceChannel) {
            this.socket.unsubscribe(this.deviceChannel.name);
        }
    }

    initializeChannels() {
        this.leaveChannels();

        // Subscribe to the network-wide channel
        this.networkChannel = this.socket.subscribe(`ssid-${this.ssid}-network-${this.network}`);
        this.networkChannel.bind('pusher:subscription_error', (e) => {
            console.error(`[Pusher Status ${e.status}] Can\'t subscripe to Network Channel: ${e.error}`);
        });
        
        // Subscribe to this device's unique channel
        this.deviceChannel = this.socket.subscribe(`ssid-${this.ssid}-device-${this.macAddress.replaceAll(':', '=')}`);
        this.deviceChannel.bind('pusher:subscription_error', (e) => {
            console.error(`[Pusher Status ${e.status}] Can\'t subscripe to Device Channel: ${e.error}`);
        });

        this.networkChannel.bind('client-message', this.receive.bind(this));
        this.deviceChannel.bind('client-message', this.receive.bind(this));
    }

    send(data) {
        // broadcast like in wlan, `send_event` is only allowed if you joined this channel (?)
        this.socket.send_event('client-message', data, `ssid-${this.ssid}-network-${this.network}`);
    }

    receive(data) {
        console.log('received')
        this.manager.network.ethernet.receive(data);
    }

    debug(msg) {
        this.manager.debug('network', 'physical', msg)
    }
}

export default PhysicalLayer;