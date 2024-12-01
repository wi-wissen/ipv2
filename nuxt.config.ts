// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/i18n',
    '@pinia/nuxt',
    '@pinia-plugin-persistedstate/nuxt',
  ],
  runtimeConfig: {
    public: {
      debug: process.env.DEBUG,
      pusherHost: process.env.SOKETI_HOST,
      pusherPort: process.env.SOKETI_PORT,
      pusherForceTLS: process.env.SOKETI_TLS,
      pusherAppKey: process.env.SOKETI_APP_KEY,
    }
  },
  routeRules: { // https://nuxt.com/docs/guide/concepts/rendering#route-rules
    // renders only on client-side
    '/client': { ssr : false },
    '/services/*': { ssr : false },
    '/clients/*': { ssr : false },
  },
})