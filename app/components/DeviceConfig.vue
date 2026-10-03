<template>
  <AppPanel title="Netzwerkeinstellungen">
    <div class="space-y-4">
      <div
        v-for="(nic, index) in deviceStore.interfaces"
        :key="nic.mac"
        class="rounded-lg border border-slate-200 bg-slate-50 p-3"
      >
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-slate-700">Netzwerkkarte {{ index + 1 }}</h3>
          <button
            v-if="deviceStore.interfaces.length > 1"
            type="button"
            class="text-xs text-red-600 hover:underline"
            @click="deviceStore.removeInterface(index)"
          >
            Entfernen
          </button>
        </div>
        <div class="grid gap-3 sm:grid-cols-3">
          <label class="block">
            <span class="block text-sm font-medium text-slate-700">MAC-Adresse</span>
            <input
              :value="nic.mac"
              readonly
              class="mt-1 block w-full rounded-md border-slate-200 bg-slate-100 font-mono text-sm text-slate-600"
            >
          </label>
          <label class="block">
            <span class="block text-sm font-medium text-slate-700">Netzsegment (Kabel)</span>
            <input
              v-model.lazy.number="nic.segment"
              type="number"
              min="1"
              max="254"
              class="mt-1 block w-full rounded-md border-slate-300 font-mono text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
          </label>
          <IpField v-model="nic.ip" label="IP-Adresse" placeholder="leer = per DHCP" />
        </div>
      </div>

      <button
        v-if="deviceStore.services.router"
        type="button"
        class="text-sm text-primary-700 hover:underline"
        @click="deviceStore.addInterface()"
      >
        + Netzwerkkarte hinzufügen
      </button>

      <div class="grid gap-3 sm:grid-cols-2">
        <IpField v-model="deviceStore.gateway" label="Standard-Gateway" placeholder="z. B. 10.1" />
        <IpField v-model="deviceStore.dns" label="DNS-Server" placeholder="z. B. 10.3" />
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          class="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          :disabled="requesting"
          @click="requestIp"
        >
          {{ requesting ? 'Frage DHCP-Server …' : 'IP-Adresse per DHCP anfordern' }}
        </button>
        <span v-if="dhcpError" class="text-sm text-red-600">{{ dhcpError }}</span>
      </div>

      <fieldset>
        <legend class="text-sm font-medium text-slate-700">Dienste auf diesem Gerät</legend>
        <div class="mt-1 flex flex-wrap gap-x-5 gap-y-2">
          <label v-for="(label, service) in serviceLabels" :key="service" class="inline-flex items-center gap-2 text-sm text-slate-700">
            <input v-model="deviceStore.services[service]" type="checkbox" class="rounded text-primary-600 focus:ring-primary-500">
            {{ label }}
          </label>
        </div>
      </fieldset>
    </div>
  </AppPanel>
</template>

<script>
import { mapStores } from 'pinia'
import { useDeviceStore } from '~/stores/device.js'

export default {
  props: {
    device: { type: Object, required: true },
  },
  data() {
    return {
      requesting: false,
      dhcpError: '',
      serviceLabels: {
        dhcp: 'DHCP-Server',
        dns: 'DNS-Server',
        http: 'Webserver',
        router: 'Router (Pakete weiterleiten)',
      },
    }
  },
  computed: {
    ...mapStores(useDeviceStore),
  },
  methods: {
    async requestIp() {
      this.requesting = true
      this.dhcpError = ''
      try {
        await this.device.requestIp()
      } catch (error) {
        this.dhcpError = error.message
      } finally {
        this.requesting = false
      }
    },
  },
}
</script>
