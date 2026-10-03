// Erstellt die Screenshots für docs/anleitung.md.
//
//   npm run build && node .output/server/index.mjs   (in einem zweiten Terminal)
//   npm run screenshots
//
// Umgebungsvariablen:
//   BASE_URL         Adresse der laufenden App (Standard: http://localhost:3000)
//   CHROMIUM_PATH    Pfad zu einem Chromium, falls Playwright keinen eigenen findet

import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = new URL('../docs/bilder/', import.meta.url).pathname;
const VIEWPORT = { width: 1280, height: 860 };

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function createClassroom(ssid) {
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, locale: 'de-DE' });
    await context.addInitScript((value) => {
        localStorage.setItem('session', JSON.stringify({ ssid: value }));
    }, ssid);
    return context;
}

async function openDevice(context, role) {
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/device/${role}`);
    await page.getByText('Verbunden über den Server').first().waitFor();
    // Die DevTools-Schaltfläche von `nuxt dev` soll nicht auf den Bildern erscheinen
    await page.addStyleTag({ content: '#nuxt-devtools-container { display: none !important; }' });
    return page;
}

async function shot(target, name) {
    const page = target.page?.() ?? target;
    await page.bringToFront();
    await page.evaluate(() => document.activeElement?.blur());
    await page.waitForTimeout(1200); // ARP-Tabelle aktualisiert sich jede Sekunde
    await target.screenshot({ path: `${OUT}${name}.png` });
    console.log(`✓ ${name}.png`);
}

function panel(page, title) {
    return page.locator('section', { has: page.getByRole('heading', { name: title, exact: true }) });
}

// Ein Feld ändern und wie ein Mensch mit Tab verlassen (löst "change" aus)
async function fill(locator, value) {
    await locator.fill(String(value));
    await locator.press('Tab');
}

// ---------- Szenario 1: Ein Netz mit DHCP, DNS, Webserver und Client ----------

const classroom = await createClassroom('KLASSE-7B');

const start = await classroom.newPage();
await start.goto(BASE_URL);
await start.getByText('Baue ein Netzwerk!').waitFor();
await shot(start, '01-startseite');

const dhcp = await openDevice(classroom, 'dhcp');
const dns = await openDevice(classroom, 'dns');
const web = await openDevice(classroom, 'http');
const client = await openDevice(classroom, 'client');

await client.locator('h1 + span', { hasText: '10.100' }).waitFor();
await shot(client, '02-client-dhcp');

await client.getByRole('button', { name: 'Öffnen' }).click();
await client.getByText('200 OK', { exact: true }).waitFor();
await shot(client, '03-client-webseite');

await client.getByRole('button', { name: 'Netzzugang' }).click();
await client.getByRole('button', { name: 'Internet' }).click();
await client.locator('summary', { hasText: '[SYN]' }).first().click();
await shot(panel(client, 'Protokoll'), '04-protokoll-tcp');

await shot(dhcp, '05-dhcp-server');
await shot(dns, '06-dns-server');

await web.bringToFront();
const homepage = web.getByLabel('Inhalt von /');
await fill(homepage, '<h1>Klasse 7b</h1>\n<p>Willkommen auf unserer Seite!</p>\n<p><a href="/kontakt">Zum Kontakt</a></p>');
await fill(web.getByLabel('Neuer Pfad'), '/kontakt');
await web.getByRole('button', { name: 'Seite anlegen' }).click();
await fill(web.getByLabel('Inhalt von /kontakt'), '<h1>Kontakt</h1>\n<p>Raum 204</p>');
await shot(panel(web, 'Webserver'), '07-webserver');

await client.bringToFront();
await client.getByRole('button', { name: 'Öffnen' }).click();
await client.getByText('200 OK', { exact: true }).waitFor();
await shot(panel(client, 'Webbrowser'), '08-browser-eigene-seite');

await client.getByLabel('Adresszeile').fill('www.local/gibtsnicht');
await client.getByRole('button', { name: 'Öffnen' }).click();
await client.getByText('404 Not Found').first().waitFor();
await shot(panel(client, 'Webbrowser'), '09-browser-404');

await classroom.close();

// ---------- Szenario 2: Zwei Netze mit einem Router ----------

const routed = await createClassroom('KLASSE-7B-ROUTER');
const router = await openDevice(routed, 'router');
await openDevice(routed, 'dhcp');
const dns2 = await openDevice(routed, 'dns');

await fill(dns2.getByLabel('IP-Adresse für www.local'), '20.4');

const web2 = await openDevice(routed, 'http');
await fill(web2.getByLabel('Netzsegment (Kabel)'), 20);
await fill(web2.getByLabel('IP-Adresse', { exact: true }), '20.4');
await fill(web2.getByLabel('Standard-Gateway'), '20.1');

const client2 = await openDevice(routed, 'client');
await client2.locator('h1 + span', { hasText: '10.100' }).waitFor();
await client2.getByRole('button', { name: 'Öffnen' }).click();
await client2.getByText('200 OK', { exact: true }).waitFor();
await shot(client2, '10-client-ueber-router');

await router.getByRole('button', { name: 'Netzzugang' }).click();
await shot(router, '11-router');

await shot(panel(web2, 'Netzwerkeinstellungen'), '12-webserver-netz-20');

await routed.close();
await browser.close();
