<template>
  <AppPanel title="DNS-Server" description="Diese Namen kann der Server in IP-Adressen übersetzen.">
    <table class="w-full text-sm">
      <thead class="text-left text-slate-500">
        <tr>
          <th class="py-1 font-medium">Name</th>
          <th class="py-1 font-medium">IP-Adresse</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr v-for="(ip, domain) in deviceStore.dnsRecords" :key="domain" class="border-t border-slate-100">
          <td class="py-1 pr-2 font-mono">{{ domain }}</td>
          <td class="py-1 pr-2">
            <input
              :value="ip"
              class="block w-full rounded-md border-slate-300 py-1 font-mono text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
              :class="{ 'border-red-400': !isValidIp(ip) }"
              :aria-label="`IP-Adresse für ${domain}`"
              @change="deviceStore.setDnsRecord(domain, $event.target.value.trim())"
            >
          </td>
          <td class="py-1 text-right">
            <button type="button" class="text-xs text-red-600 hover:underline" @click="deviceStore.removeDnsRecord(domain)">
              Löschen
            </button>
          </td>
        </tr>
        <tr class="border-t border-slate-200">
          <td class="py-2 pr-2">
            <input
              v-model="newDomain"
              placeholder="z. B. schule.local"
              aria-label="Neuer Name"
              class="block w-full rounded-md border-slate-300 py-1 font-mono text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
              @keyup.enter="addEntry"
            >
          </td>
          <td class="py-2 pr-2">
            <input
              v-model="newIp"
              placeholder="z. B. 10.4"
              aria-label="Neue IP-Adresse"
              class="block w-full rounded-md border-slate-300 py-1 font-mono text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
              @keyup.enter="addEntry"
            >
          </td>
          <td class="py-2 text-right">
            <button
              type="button"
              class="rounded-md bg-primary-600 px-2 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              :disabled="!canAdd"
              @click="addEntry"
            >
              Hinzufügen
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </AppPanel>
</template>

<script>
import { mapStores } from 'pinia'
import { useDeviceStore } from '~/stores/device.js'
import { isValidIp } from '~/simulation/address.js'
import { normalizeName } from '~/simulation/layers/DNS.js'

export default {
  data() {
    return {
      newDomain: '',
      newIp: '',
    }
  },
  computed: {
    ...mapStores(useDeviceStore),
    canAdd() {
      return normalizeName(this.newDomain) !== '' && isValidIp(this.newIp)
    },
  },
  methods: {
    isValidIp,
    addEntry() {
      if (!this.canAdd) return
      this.deviceStore.setDnsRecord(normalizeName(this.newDomain), this.newIp.trim())
      this.newDomain = ''
      this.newIp = ''
    },
  },
}
</script>
