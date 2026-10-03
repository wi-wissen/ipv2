import { defineStore } from 'pinia'

/** Erlaubte Zeichen im Netzwerknamen: A–Z, 0–9, "-" und "_". */
export function normalizeSsid(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export function randomSsid() {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return `NETZ-${code}`
}

// Der Netzwerkname (SSID) gilt für alle Tabs dieses Browsers (localStorage).
// Alle Geräte mit derselben SSID sind miteinander verbunden.
export const useSessionStore = defineStore('session', {
  state: () => ({
    ssid: '',
  }),

  actions: {
    /** Legt beim ersten Start einen zufälligen Namen an (und speichert ihn damit). */
    ensureSsid() {
      if (!this.ssid) this.ssid = randomSsid()
      return this.ssid
    },

    setSsid(value) {
      this.ssid = normalizeSsid(value) || randomSsid()
    },
  },

  persist: {
    storage: piniaPluginPersistedstate.localStorage(),
  },
})
