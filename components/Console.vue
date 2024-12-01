<script>
export default {
    props: {
        socket: {
            type: Object,
            default: () => ({})
        },
    },
    data() {
        return {
            logs: [],
            visibleLayers: {
                transport: true,
                network: true,
                ip: true,
                application: true
            },
            layerLabels: {
                network: { de: 'Netzzugangsschicht', en: 'Network Access Layer' },
                ip: { de: 'Internetschicht', en: 'Internet Layer' },
                transport: { de: 'Transportschicht', en: 'Transport Layer' },
                application: { de: 'Anwendungsschicht', en: 'Application Layer' },
                error: { de: 'Fehler', en: 'Error' },
            },
            language: 'de', // oder 'en' für Englisch
            vSocket: null,
        }
    },
    computed: {
      store() {
        return useLogStore();
      },
    },
    methods: {
        toggleLayer(layer) {
            this.visibleLayers[layer] = !this.visibleLayers[layer]
        },
    },
    mounted() {
        this.vSocket = this.socket ?? new Socket();
        if(! this.socket) {
            this.vSocket.connect();
        }
    }
}
</script>

<template>
  <div id="console" class="bg-gray-900 text-white p-4 font-mono">
    <div class="mb-4 flex space-x-2">
        <template v-for="(label, layer) in layerLabels" :key="layer">
            <button 
                v-if="layer != 'error'"
                @click="toggleLayer(layer)"
                :class="[
                'px-2 py-1 rounded',
                visibleLayers[layer] ? 'bg-blue-500' : 'bg-gray-700'
                ]"
            >
                {{ label[language] }}
            </button>
        </template>
    </div>
    <div class="space-y-1">
      <div 
        v-for="(log, index) in store.logs" 
        :key="index"
        v-show="log.layer == 'error' || visibleLayers[log.layer]"
        :class="[
          'py-1',
          {
            'text-red-400': log.type === 'error',
            'text-yellow-400': log.type === 'warn',
            'text-blue-400': log.type === 'info',
            'text-gray-400': log.type === 'debug',
            'text-green-400': log.type === 'success',
          }
        ]"
      >
        <span class="text-gray-500">{{ log.timestamp.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) }}</span>
        <span class="ml-2 uppercase font-bold">{{ layerLabels[log.layer] ? layerLabels[log.layer][language] : log.type }}</span>
        <span v-if="log.protocol" class="ml-2">[{{ log.protocol }}]</span>
        <span class="ml-2">{{ log.msg }}</span>
        <span v-if="log.data" class="ml-2">{{ JSON.stringify(log.data) }}</span>
      </div>
    </div>
  </div>
</template>