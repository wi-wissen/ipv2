import { defineNuxtModule } from 'nuxt/kit'

// Workaround für den Entwicklungsserver (`npm run dev`):
// Bricht ein Browser eine WebSocket-Verbindung hart ab (z. B. beim Schließen),
// lehnt der Nitro-Dev-Proxy eine Promise ab, die niemand abfängt (ECONNRESET).
// Der Dev-Server beendet sich dann. Im Produktionsbetrieb tritt das nicht auf.
export default defineNuxtModule({
  meta: { name: 'dev-websocket-guard' },
  setup(_options, nuxt) {
    if (!nuxt.options.dev) return

    nuxt.hook('listen', () => {
      const server = nuxt.server as { upgrade?: (...args: unknown[]) => unknown } | undefined
      if (!server?.upgrade) return
      const upgrade = server.upgrade.bind(server)
      server.upgrade = (...args: unknown[]) => Promise.resolve(upgrade(...args)).catch(() => {})
    })
  },
})
