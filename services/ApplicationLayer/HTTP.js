class HTTP {
    /**
     * Erstellt eine neue HTTP-Instanz.
     * @param {Object} manager - Der Network Manager, der diese HTTP-Instanz verwaltet.
     */
    constructor(manager) {
        this.manager = manager;
        this.port = 80; // Standard-HTTP-Port
        if (this.manager.store.isHttpServer) {
            this.startServer();
        } else {
            this.log('HTTP-Server ist deaktiviert');
        }
    }

    /**
     * Startet den HTTP-Server.
     */
    startServer() {
        this.manager.transport.tcp.listen(this.port, this.handleRequest.bind(this));
        this.log('HTTP-Server gestartet auf Port 80');
    }

    handleRequest(request) {
        if (!this.manager.store.isHttpServer) return;
        this.log('Anfrage empfangen', request);
        
        if (request.method !== 'GET') {
            return this.methodNotAllowed();
        }

        const url = request.url ?? '/';
        if(this.manager.store.hasHttpEntry(url)) {
            return this.fullResponse(this.manager.store.httpEntries[url]);
        } else {
            return this.notFound();
        }
    }

    fullResponse(response) {
        if (!this.manager.store.isHttpServer) return;
        const fullResponse = {
            statusCode: response.statusCode || 200,
            headers: {
                'Content-Type': response.contentType || 'application/json',
                'Content-Length': JSON.stringify(response).length,
                ...response.headers
            },
            body: response
        };
        this.log('Antwort gesendet', fullResponse);
        return fullResponse;
    }

    notFound() {
        if (!this.manager.store.isHttpServer) return;
        const response = {
            statusCode: 404,
            headers: {
                'Content-Type': 'text/plain',
                'Content-Length': 9
            },
            body: 'Not Found'
        };
        this.log('404 Nicht gefunden');
        return response;
    }

    methodNotAllowed() {
        if (!this.manager.store.isHttpServer) return;
        const response = {
            statusCode: 405,
            headers: {
                'Content-Type': 'text/plain',
                'Content-Length': 29,
                'Allow': 'GET'
            },
            body: 'Method Not Allowed. Use GET.'
        };
        this.log('405 Methode nicht erlaubt');
        return response;
    }

    /**
     * Sendet eine HTTP GET-Anfrage an die angegebene URL.
     * @param {string} url - Die URL für die Anfrage.
     * @returns {Promise<Object>} Ein Promise, das mit der HTTP-Antwort aufgelöst wird.
     */
    async get(ip, url) {
        const parsedUrl = new URL(url);
        const host = parsedUrl.hostname;
        const port = parsedUrl.port || 80;

        const request = {
            method: 'GET',
            url: parsedUrl.pathname + parsedUrl.search,
            headers: {
                'Host': host,
                'Accept': 'application/json'
            }
        };

        this.log("Send Data", request);

        console.log(request, 0, ip, port);

        console.log('http get');
        const result = await this.manager.transport.tcp.send(request, 0, ip, port);
        console.log('http get', result);

        return result;
    }

    /**
     * Protokolliert eine Nachricht mit zusätzlichen Daten.
     * @param {string} msg - Die zu protokollierende Nachricht.
     * @param {*} data - Zusätzliche zu protokollierende Daten.
     */
    log(msg, data) {
        this.manager.log('application','HTTP-Server', msg, data);
    }
}

export default HTTP;