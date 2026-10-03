# IPv2 – Netzwerksimulation für den Informatikunterricht

Jeder Browser-Tab wird zu einem Gerät (Client, DHCP-, DNS-, Webserver oder Router).
Die Geräte tauschen simulierte Pakete aus und protokollieren jeden Schritt im
TCP/IP-Schichtenmodell. Adressen sind bewusst vereinfacht: IP-Adressen bestehen aus
`Netz.Host` (z. B. `10.5`), MAC-Adressen aus drei Bytes.

**➜ [Benutzeranleitung mit Screenshots](docs/anleitung.md)**

![Client ruft eine Webseite ab](docs/bilder/03-client-webseite.png)

## Schnellstart

Voraussetzung: Node.js ≥ 20.19

```bash
npm install
npm run dev                          # Entwicklung: http://localhost:3000
```

Für den Unterricht (alle Rechner verbinden sich mit diesem Server):

```bash
npm run build
node .output/server/index.mjs        # Port mit PORT=… änderbar
```

## Skripte

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver |
| `npm run build` | Produktions-Build (Node-Server mit WebSocket-Hub) |
| `npm run generate` | Statische Seite ohne Hub (verbindet nur Tabs im selben Browser) |
| `npm test` | Alle Tests (Vitest) |
| `npm run screenshots` | Screenshots für die Anleitung neu erstellen (App muss laufen, siehe Skript) |

## Aufbau

```
app/
  simulation/          Die Simulation – reines JavaScript, ohne Vue/Nuxt
    Device.js          Ein Gerät mit allen Schichten
    NetworkInterface.js  Netzwerkkarte: Kabel, Ethernet, ARP
    layers/            PhysicalLayer, Ethernet, ARP, IPv2, UDP, TCP, DHCP, DNS, HTTP
    media/             Übertragungsmedien: WebSocket, BroadcastChannel, Arbeitsspeicher (Tests)
    address.js         IPv2- und MAC-Adressen
    roles.js           Voreinstellungen der Gerätetypen
  stores/              Pinia: Geräteeinstellungen (sessionStorage), Netzwerkname (localStorage), Protokoll
  components/          Oberfläche (Options API)
  pages/               Startseite und /device/[role]
server/routes/_ws.js   WebSocket-Hub: verteilt Ethernet-Rahmen je Netzwerkname und Segment
modules/               Workaround für den Nuxt-Dev-Server (WebSocket-Abbrüche)
test/                  Vitest: simulation/ (Node) und components/ (Nuxt-Umgebung)
docs/                  Benutzeranleitung und Screenshots
```

Ein Rahmen nimmt diesen Weg: `HTTP → TCP → IPv2 → Ethernet → Kabel → (Hub) → Kabel → Ethernet → IPv2 → TCP → HTTP`.
Jede Schicht schreibt ins Protokoll; die Oberfläche zeigt es nach Schichten gefiltert an.

## Konfiguration

| Variable | Bedeutung |
|---|---|
| `NUXT_PUBLIC_WS_URL` | Anderer WebSocket-Hub, z. B. `wss://example.org/_ws` (Standard: derselbe Server unter `/_ws`) |
| `PORT` | Port des Produktionsservers |
