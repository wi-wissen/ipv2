import { defineStore } from 'pinia'

const MAX_ENTRIES = 500

// Protokoll ("Konsole") des Geräts. Wird nicht gespeichert.
export const useLogStore = defineStore('log', {
  state: () => ({
    entries: [],
    nextId: 1,
  }),

  actions: {
    add({ level, layer, protocol, message, data }) {
      this.entries.push({
        id: this.nextId++,
        time: new Date(),
        level,
        layer,
        protocol,
        message,
        // Kopie, damit spätere Änderungen am Paket den Eintrag nicht verändern
        data: data === undefined ? null : JSON.parse(JSON.stringify(data)),
      })
      if (this.entries.length > MAX_ENTRIES) {
        this.entries.splice(0, this.entries.length - MAX_ENTRIES)
      }
    },

    clear() {
      this.entries = []
    },
  },
})
