<template>
  <section class="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 font-mono text-sm text-slate-100 shadow-sm">
    <header class="flex flex-wrap items-center gap-2 border-b border-slate-700 px-3 py-2">
      <h2 class="mr-2 font-sans font-semibold">Protokoll</h2>
      <button
        v-for="(label, layer) in layers"
        :key="layer"
        type="button"
        class="rounded px-2 py-0.5 font-sans text-xs"
        :class="visibleLayers[layer] ? layerColors[layer].button : 'bg-slate-700 text-slate-400'"
        :aria-pressed="visibleLayers[layer]"
        @click="visibleLayers[layer] = !visibleLayers[layer]"
      >
        {{ label }}
      </button>
      <label class="ml-auto inline-flex items-center gap-1 font-sans text-xs text-slate-300">
        <input v-model="showDebug" type="checkbox" class="rounded bg-slate-700 text-primary-500 focus:ring-primary-500">
        Details
      </label>
      <button type="button" class="rounded bg-slate-700 px-2 py-0.5 font-sans text-xs hover:bg-slate-600" @click="logStore.clear()">
        Leeren
      </button>
    </header>

    <ol ref="list" class="max-h-[28rem] space-y-0.5 overflow-y-auto p-3">
      <li v-if="visibleEntries.length === 0" class="text-slate-500">Noch keine Einträge.</li>
      <li v-for="entry in visibleEntries" :key="entry.id" :class="levelColors[entry.level]">
        <details v-if="entry.data">
          <summary class="cursor-pointer list-none">
            <LogLine :entry="entry" :color="layerColors[entry.layer].text" />
          </summary>
          <pre class="mt-1 mb-2 ml-4 overflow-x-auto rounded bg-slate-800 p-2 text-xs text-slate-300">{{ format(entry.data) }}</pre>
        </details>
        <LogLine v-else :entry="entry" :color="layerColors[entry.layer].text" />
      </li>
    </ol>
  </section>
</template>

<script>
import { mapStores } from 'pinia'
import { useLogStore } from '~/stores/log.js'
import { LAYERS } from '~/simulation/logging.js'

export default {
  data() {
    return {
      layers: LAYERS,
      visibleLayers: Object.fromEntries(Object.keys(LAYERS).map((layer) => [layer, true])),
      showDebug: false,
      layerColors: {
        link: { button: 'bg-sky-600', text: 'text-sky-300' },
        internet: { button: 'bg-violet-600', text: 'text-violet-300' },
        transport: { button: 'bg-amber-600', text: 'text-amber-300' },
        application: { button: 'bg-emerald-600', text: 'text-emerald-300' },
        system: { button: 'bg-slate-500', text: 'text-slate-300' },
      },
      levelColors: {
        debug: 'text-slate-400',
        info: 'text-slate-100',
        success: 'text-emerald-400',
        error: 'text-red-400',
      },
    }
  },
  computed: {
    ...mapStores(useLogStore),
    visibleEntries() {
      return this.logStore.entries.filter((entry) =>
        this.visibleLayers[entry.layer] && (this.showDebug || entry.level !== 'debug'))
    },
  },
  watch: {
    'visibleEntries.length'() {
      // Automatisch nach unten scrollen, wenn man bereits unten war
      const list = this.$refs.list
      if (!list) return
      const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40
      if (atBottom) this.$nextTick(() => { list.scrollTop = list.scrollHeight })
    },
  },
  methods: {
    format(data) {
      return JSON.stringify(data, null, 2)
    },
  },
}
</script>
