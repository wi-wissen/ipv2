import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: true },

  // Die Simulation läuft vollständig im Browser.
  ssr: false,

  modules: [
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
  ],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'de' },
      title: 'IPv2 – Netzwerksimulation',
    },
  },

  runtimeConfig: {
    public: {
      // Optional: Adresse eines anderen WebSocket-Hubs, z. B. wss://example.org/_ws
      wsUrl: '',
    },
  },

  // WebSocket-Hub unter /_ws (server/routes/_ws.js)
  nitro: {
    experimental: { websocket: true },
  },

  vite: {
    plugins: [tailwindcss()],
  },
})
