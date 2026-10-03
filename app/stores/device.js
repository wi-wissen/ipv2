import { defineStore } from 'pinia'
import { createConfig } from '~/simulation/roles.js'

// Einstellungen des Geräts in diesem Browser-Tab.
// Liegen im sessionStorage: Jeder Tab ist ein eigenes Gerät
// und behält seine Einstellungen beim Neuladen.
export const useDeviceStore = defineStore('device', {
  state: () => createConfig('client'),

  actions: {
    /** Setzt alle Einstellungen auf die Voreinstellung einer Rolle zurück. */
    applyRole(role) {
      const mac = this.interfaces[0]?.mac
      this.$patch((state) => Object.assign(state, createConfig(role, { mac })))
    },

    addInterface() {
      const interfaceConfig = createConfig('client').interfaces[0]
      interfaceConfig.segment = Math.max(...this.interfaces.map((i) => Number(i.segment) || 0)) + 10
      this.interfaces.push(interfaceConfig)
    },

    removeInterface(index) {
      if (this.interfaces.length > 1) this.interfaces.splice(index, 1)
    },

    setDnsRecord(domain, ip) {
      this.dnsRecords[domain] = ip
    },

    removeDnsRecord(domain) {
      delete this.dnsRecords[domain]
    },

    setHttpPage(path, content) {
      this.httpPages[path] = content
    },

    removeHttpPage(path) {
      delete this.httpPages[path]
    },

    releaseLease(mac) {
      delete this.dhcp.leases[mac]
    },
  },

  persist: {
    storage: piniaPluginPersistedstate.sessionStorage(),
  },
})
