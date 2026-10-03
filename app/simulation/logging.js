// Gemeinsame Begriffe für das Protokoll (die "Konsole" eines Geräts).

export const LAYERS = {
    link: 'Netzzugang',
    internet: 'Internet',
    transport: 'Transport',
    application: 'Anwendung',
    system: 'System',
};

/**
 * Erzeugt eine kleine Log-Hilfe für eine Schicht/ein Protokoll.
 * `device.log` leitet die Einträge an den Logger des Geräts weiter.
 */
export function createLog(device, layer, protocol) {
    const write = (level) => (message, data) => device.log({ level, layer, protocol, message, data });
    return {
        debug: write('debug'),
        info: write('info'),
        success: write('success'),
        error: write('error'),
    };
}
