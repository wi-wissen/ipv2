import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDeviceStore } from '~/stores/device.js'
import { useLogStore } from '~/stores/log.js'
import { normalizeSsid, useSessionStore } from '~/stores/session.js'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('Gerätestore', () => {
  it('übernimmt bei einem Rollenwechsel die MAC-Adresse', () => {
    const store = useDeviceStore()
    const mac = store.interfaces[0].mac

    store.applyRole('router')

    expect(store.role).toBe('router')
    expect(store.interfaces).toHaveLength(2)
    expect(store.interfaces[0].mac).toBe(mac)
    expect(store.services.router).toBe(true)
  })

  it('legt neue Netzwerkkarten in einem neuen Segment an', () => {
    const store = useDeviceStore()
    store.applyRole('router')

    store.addInterface()

    expect(store.interfaces.map((nic) => nic.segment)).toEqual([10, 20, 30])
    store.removeInterface(2)
    store.removeInterface(1)
    store.removeInterface(0)
    expect(store.interfaces).toHaveLength(1)
  })
})

describe('Sitzung', () => {
  it('bereinigt Netzwerknamen', () => {
    expect(normalizeSsid('  Klasse 7b! ')).toBe('KLASSE-7B')
    expect(normalizeSsid('---')).toBe('')
    expect(normalizeSsid('x'.repeat(60))).toHaveLength(40)
  })

  it('erzeugt einen Namen nur, wenn noch keiner gesetzt ist', () => {
    const store = useSessionStore()
    const first = store.ensureSsid()

    expect(first).toMatch(/^NETZ-[A-Z0-9]{4}$/)
    expect(store.ensureSsid()).toBe(first)

    store.setSsid('')
    expect(store.ssid).toMatch(/^NETZ-/)
  })
})

describe('Protokoll', () => {
  it('kopiert Daten und begrenzt die Anzahl der Einträge', () => {
    const store = useLogStore()
    const data = { value: 1 }
    store.add({ level: 'info', layer: 'system', protocol: 'Test', message: 'a', data })
    data.value = 2

    expect(store.entries[0].data).toEqual({ value: 1 })

    for (let i = 0; i < 600; i++) store.add({ level: 'info', layer: 'system', protocol: 'Test', message: String(i) })
    expect(store.entries).toHaveLength(500)
    expect(store.entries.at(-1).message).toBe('599')
  })
})
