<template>
  <AppPanel title="Webserver" description="Diese Seiten liefert der Webserver aus. Erlaubt ist einfaches HTML.">
    <div class="space-y-3">
      <div v-for="(content, path) in deviceStore.httpPages" :key="path" class="rounded-lg border border-slate-200">
        <div class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5">
          <span class="font-mono text-sm">{{ path }}</span>
          <button type="button" class="text-xs text-red-600 hover:underline" @click="deviceStore.removeHttpPage(path)">
            Löschen
          </button>
        </div>
        <textarea
          :value="content"
          rows="4"
          :aria-label="`Inhalt von ${path}`"
          class="block w-full rounded-b-lg border-0 font-mono text-sm focus:ring-primary-500"
          @change="deviceStore.setHttpPage(path, $event.target.value)"
        />
      </div>

      <div class="rounded-lg border border-dashed border-slate-300 p-3">
        <div class="flex gap-2">
          <input
            v-model="newPath"
            placeholder="Pfad, z. B. /kontakt"
            aria-label="Neuer Pfad"
            class="block w-full rounded-md border-slate-300 py-1 font-mono text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
          <button
            type="button"
            class="shrink-0 rounded-md bg-primary-600 px-2 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            :disabled="!normalizedPath"
            @click="addPage"
          >
            Seite anlegen
          </button>
        </div>
      </div>
    </div>
  </AppPanel>
</template>

<script>
import { mapStores } from 'pinia'
import { useDeviceStore } from '~/stores/device.js'

export default {
  data() {
    return {
      newPath: '',
    }
  },
  computed: {
    ...mapStores(useDeviceStore),
    normalizedPath() {
      const path = this.newPath.trim().replace(/\s+/g, '-')
      if (!path) return ''
      return path.startsWith('/') ? path : `/${path}`
    },
  },
  methods: {
    addPage() {
      if (!this.normalizedPath) return
      if (!Object.hasOwn(this.deviceStore.httpPages, this.normalizedPath)) {
        this.deviceStore.setHttpPage(this.normalizedPath, `<h1>${this.normalizedPath}</h1>\n<p>Neue Seite</p>`)
      }
      this.newPath = ''
    },
  },
}
</script>
