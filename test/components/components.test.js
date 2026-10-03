import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import DnsEntries from '~/components/DnsEntries.vue'
import HttpPages from '~/components/HttpPages.vue'
import IpField from '~/components/IpField.vue'
import LogConsole from '~/components/LogConsole.vue'
import WebBrowser from '~/components/WebBrowser.vue'
import { useDeviceStore } from '~/stores/device.js'
import { useLogStore } from '~/stores/log.js'

// Die Komponenten nutzen die Pinia-Instanz der Nuxt-Testumgebung.
beforeEach(() => {
  useDeviceStore().$reset()
  useLogStore().clear()
})

describe('IpField', () => {
  it('zeigt bei ungültigen Adressen einen Hinweis', async () => {
    const field = await mountSuspended(IpField, { props: { label: 'IP', modelValue: '10.300' } })
    expect(field.text()).toContain('Format: Netz.Host')

    await field.setProps({ modelValue: '10.5' })
    expect(field.text()).not.toContain('Format')
  })

  it('meldet den bereinigten Wert', async () => {
    const field = await mountSuspended(IpField, { props: { label: 'IP' } })
    await field.find('input').setValue(' 10.7 ')

    expect(field.emitted('update:modelValue')).toEqual([['10.7']])
  })
})

describe('DnsEntries', () => {
  it('fügt nur gültige Einträge hinzu und löscht sie wieder', async () => {
    const store = useDeviceStore()
    store.applyRole('dns')
    const panel = await mountSuspended(DnsEntries)
    const add = panel.findAll('button').find((button) => button.text() === 'Hinzufügen')

    await panel.find('input[aria-label="Neuer Name"]').setValue('Schule.Local')
    await panel.find('input[aria-label="Neue IP-Adresse"]').setValue('10.400')
    expect(add.attributes('disabled')).toBeDefined()

    await panel.find('input[aria-label="Neue IP-Adresse"]').setValue('10.40')
    await add.trigger('click')
    expect(store.dnsRecords['schule.local']).toBe('10.40')

    const remove = panel.findAll('tr').find((row) => row.text().includes('schule.local')).find('button')
    await remove.trigger('click')
    expect(store.dnsRecords['schule.local']).toBeUndefined()
  })
})

describe('HttpPages', () => {
  it('legt neue Seiten mit führendem Schrägstrich an', async () => {
    const store = useDeviceStore()
    store.applyRole('http')
    const panel = await mountSuspended(HttpPages)

    await panel.find('input[aria-label="Neuer Pfad"]').setValue('kontakt')
    await panel.findAll('button').find((button) => button.text() === 'Seite anlegen').trigger('click')

    expect(Object.keys(store.httpPages)).toEqual(['/', '/kontakt'])
  })
})

describe('LogConsole', () => {
  it('filtert nach Schichten und blendet Details aus', async () => {
    const log = useLogStore()
    log.add({ level: 'info', layer: 'link', protocol: 'ARP', message: 'Wer hat 10.4?' })
    log.add({ level: 'info', layer: 'application', protocol: 'DNS', message: 'Anfrage' })
    log.add({ level: 'debug', layer: 'application', protocol: 'DNS', message: 'Geheim' })
    const console = await mountSuspended(LogConsole)

    expect(console.text()).toContain('Wer hat 10.4?')
    expect(console.text()).not.toContain('Geheim')

    await console.findAll('button').find((button) => button.text() === 'Netzzugang').trigger('click')
    expect(console.text()).not.toContain('Wer hat 10.4?')

    await console.find('input[type="checkbox"]').setValue(true)
    expect(console.text()).toContain('Geheim')
  })
})

describe('WebBrowser', () => {
  it('zeigt die Antwort des Webservers an', async () => {
    const device = {
      http: {
        get: async () => ({ status: 200, statusText: 'OK', ip: '10.4', url: { host: 'www.local', path: '/' }, body: '<h1>Hallo</h1>' }),
      },
    }
    const browser = await mountSuspended(WebBrowser, { props: { device } })

    await browser.find('form').trigger('submit')
    await new Promise((resolve) => setTimeout(resolve))

    expect(browser.text()).toContain('200 OK')
    expect(browser.find('iframe').attributes('sandbox')).toBe('allow-same-origin')
  })

  it('zeigt Fehler verständlich an', async () => {
    const device = { http: { get: async () => { throw new Error('Kein DNS-Server eingetragen') } } }
    const browser = await mountSuspended(WebBrowser, { props: { device } })

    await browser.find('form').trigger('submit')
    await new Promise((resolve) => setTimeout(resolve))

    expect(browser.text()).toContain('Kein DNS-Server eingetragen')
  })
})
