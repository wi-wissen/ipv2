import { describe, expect, it } from 'vitest';
import {
    BROADCAST_MAC, isBroadcast, isValidIp, isValidMac, networkOf, parseIp, randomMac, sameNetwork,
} from '../../app/simulation/address.js';

describe('IPv2-Adressen', () => {
    it('zerlegt Netz und Host', () => {
        expect(parseIp('10.5')).toEqual({ network: 10, host: 5 });
        expect(parseIp(' 20.1 ')).toEqual({ network: 20, host: 1 });
    });

    it.each(['10', '10.5.1', 'a.b', '256.1', '', null, undefined])('lehnt „%s“ ab', (ip) => {
        expect(parseIp(ip)).toBeNull();
        expect(isValidIp(ip)).toBe(false);
    });

    it('reserviert 0 und 255 als Host', () => {
        expect(isValidIp('10.0')).toBe(false);
        expect(isValidIp('10.255')).toBe(false);
        expect(isValidIp('10.254')).toBe(true);
    });

    it('erkennt Broadcast-Adressen', () => {
        expect(isBroadcast('255.255')).toBe(true);
        expect(isBroadcast('10.255')).toBe(true);
        expect(isBroadcast('10.1')).toBe(false);
    });

    it('vergleicht Netze', () => {
        expect(networkOf('10.7')).toBe(10);
        expect(sameNetwork('10.1', '10.200')).toBe(true);
        expect(sameNetwork('10.1', '20.1')).toBe(false);
        expect(sameNetwork('', '')).toBe(false);
    });
});

describe('MAC-Adressen', () => {
    it('erzeugt gültige Adressen, aber nie die Broadcast-Adresse', () => {
        for (let i = 0; i < 50; i++) expect(isValidMac(randomMac())).toBe(true);
        let calls = 0;
        const random = () => (calls++ < 3 ? 0.999 : 0);
        expect(randomMac(random)).not.toBe(BROADCAST_MAC);
    });
});
