<template>
  <AppPanel title="DHCP-Server" description="Vergibt Adressen aus diesem Bereich im eigenen Netz.">
    <div class="flex flex-wrap items-end gap-3">
      <label class="block">
        <span class="block text-sm font-medium text-slate-700">Host von</span>
        <input
          v-model.lazy.number="deviceStore.dhcp.rangeStart"
          type="number" min="1" max="254"
          class="mt-1 block w-24 rounded-md border-slate-300 font-mono text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
        >
      </label>
      <label class="block">
        <span class="block text-sm font-medium text-slate-700">bis</span>
        <input
          v-model.lazy.number="deviceStore.dhcp.rangeEnd"
          type="number" min="1" max="254"
          class="mt-1 block w-24 rounded-md border-slate-300 font-mono text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
        >
      </label>
      <p class="pb-2 text-sm text-slate-500">z. B. {{ example }}</p>
    </div>

    <h3 class="mt-4 text-sm font-semibold text-slate-700">Vergebene Adressen</h3>
    <p v-if="leases.length === 0" class="text-sm text-slate-500">Noch keine.</p>
    <table v-else class="mt-1 w-full text-sm">
      <thead class="text-left text-slate-500">
        <tr>
          <th class="py-1 font-medium">MAC-Adresse</th>
          <th class="py-1 font-medium">IP-Adresse</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr v-for="lease in leases" :key="lease.mac" class="border-t border-slate-100">
          <td class="py-1 font-mono">{{ lease.mac }}</td>
          <td class="py-1 font-mono">{{ lease.ip }}</td>
          <td class="py-1 text-right">
            <button type="button" class="text-xs text-red-600 hover:underline" @click="deviceStore.releaseLease(lease.mac)">
              Freigeben
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
import { networkOf } from '~/simulation/address.js'

export default {
  computed: {
    ...mapStores(useDeviceStore),
    leases() {
      return Object.entries(this.deviceStore.dhcp.leases).map(([mac, ip]) => ({ mac, ip }))
    },
    example() {
      const network = networkOf(this.deviceStore.interfaces[0].ip) ?? 10
      const { rangeStart, rangeEnd } = this.deviceStore.dhcp
      return `${network}.${rangeStart} bis ${network}.${rangeEnd}`
    },
  },
}
</script>
