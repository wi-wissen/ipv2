<template>
  <AppPanel title="Webbrowser">
    <form class="flex gap-2" @submit.prevent="open(address)">
      <input
        v-model="address"
        placeholder="z. B. www.local oder 10.4/seite"
        aria-label="Adresszeile"
        class="block w-full rounded-md border-slate-300 font-mono text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
      >
      <button
        type="submit"
        class="shrink-0 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        :disabled="loading || !address.trim()"
      >
        {{ loading ? 'Lädt …' : 'Öffnen' }}
      </button>
    </form>

    <div class="mt-3 overflow-hidden rounded-lg border border-slate-200">
      <div class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
        <span>
          <template v-if="response">
            <strong :class="response.status === 200 ? 'text-primary-700' : 'text-red-600'">{{ response.status }} {{ response.statusText }}</strong>
            von {{ response.url.host }} ({{ response.ip }}){{ response.url.path }}
          </template>
          <template v-else-if="error">Fehler</template>
          <template v-else>Keine Seite geladen</template>
        </span>
        <label v-if="response" class="inline-flex items-center gap-1">
          <input v-model="showSource" type="checkbox" class="rounded text-primary-600 focus:ring-primary-500">
          Quelltext
        </label>
      </div>

      <p v-if="error" class="p-4 text-sm text-red-600">{{ error }}</p>
      <pre v-else-if="response && showSource" class="max-h-72 overflow-auto p-3 text-xs whitespace-pre-wrap">{{ response.body }}</pre>
      <!-- Ohne allow-scripts: Fremde Seiten können kein JavaScript ausführen. -->
      <iframe
        v-else-if="response"
        ref="frame"
        :srcdoc="response.body"
        sandbox="allow-same-origin"
        title="Geladene Webseite"
        class="h-72 w-full bg-white"
        @load="interceptLinks"
      />
      <p v-else class="p-4 text-sm text-slate-500">
        Gib oben eine Adresse ein. Der Browser fragt zuerst den DNS-Server nach der IP-Adresse
        und holt dann die Seite per HTTP vom Webserver.
      </p>
    </div>
  </AppPanel>
</template>

<script>
export default {
  props: {
    device: { type: Object, required: true },
  },
  data() {
    return {
      address: 'www.local',
      loading: false,
      response: null,
      error: '',
      showSource: false,
    }
  },
  methods: {
    async open(address) {
      this.loading = true
      this.error = ''
      this.response = null
      try {
        this.response = await this.device.http.get(address)
        this.address = `${this.response.url.host}${this.response.url.path}`
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    /** Links in der geladenen Seite werden ebenfalls über das simulierte Netz geöffnet. */
    interceptLinks() {
      const document = this.$refs.frame?.contentDocument
      if (!document) return
      document.addEventListener('click', (event) => {
        const link = event.target.closest?.('a[href]')
        if (!link) return
        event.preventDefault()
        const href = link.getAttribute('href')
        this.open(href.startsWith('/') ? `${this.response.url.host}${href}` : href)
      })
    },
  },
}
</script>
