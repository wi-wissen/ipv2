<template>
  <AppPanel title="ARP-Tabelle" description="Welche MAC-Adresse gehört zu welcher IP-Adresse? Wird beim Senden automatisch gefüllt.">
    <p v-if="rows.length === 0" class="text-sm text-slate-500">Noch leer.</p>
    <table v-else class="w-full text-sm">
      <thead class="text-left text-slate-500">
        <tr>
          <th class="py-1 font-medium">IP-Adresse</th>
          <th class="py-1 font-medium">MAC-Adresse</th>
          <th v-if="device.nics.length > 1" class="py-1 font-medium">Karte</th>
        </tr>
      </thead>
      <tbody class="font-mono">
        <tr v-for="row in rows" :key="row.nic + row.ip" class="border-t border-slate-100">
          <td class="py-1">{{ row.ip }}</td>
          <td class="py-1">{{ row.mac }}</td>
          <td v-if="device.nics.length > 1" class="py-1">{{ row.nic }}</td>
        </tr>
      </tbody>
    </table>
  </AppPanel>
</template>

<script>
const REFRESH_INTERVAL = 1000

export default {
  props: {
    device: { type: Object, required: true },
  },
  data() {
    return {
      rows: [],
      timer: null,
    }
  },
  mounted() {
    this.refresh()
    this.timer = setInterval(this.refresh, REFRESH_INTERVAL)
  },
  beforeUnmount() {
    clearInterval(this.timer)
  },
  methods: {
    // Die ARP-Tabelle lebt in der Simulation (nicht reaktiv) und wird daher regelmäßig gelesen.
    refresh() {
      this.rows = this.device.nics.flatMap((nic) => nic.arp.table().map((row) => ({ ...row, nic: nic.index + 1 })))
    },
  },
}
</script>
