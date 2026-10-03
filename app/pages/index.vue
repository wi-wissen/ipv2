<template>
  <div class="space-y-8">
    <section class="max-w-3xl space-y-3">
      <h1 class="text-2xl font-bold">Baue ein Netzwerk!</h1>
      <p>
        Jeder Browser-Tab ist ein eigenes Gerät. Alle Geräte mit demselben
        <strong>Netzwerknamen</strong> sind miteinander verbunden – egal ob sie im selben Browser
        oder auf verschiedenen Rechnern im Klassenraum laufen.
      </p>
      <p>
        Beobachte im Protokoll, wie DHCP, ARP, DNS, TCP und HTTP zusammenarbeiten,
        wenn ein Client eine Webseite abruft.
      </p>
    </section>

    <AppPanel
      title="1. Netzwerknamen wählen"
      description="Alle Geräte einer Gruppe brauchen denselben Namen. Verschiedene Gruppen nehmen verschiedene Namen."
    >
      <form class="flex max-w-md gap-2" @submit.prevent="saveSsid">
        <input
          v-model="ssid"
          aria-label="Netzwerkname (SSID)"
          class="block w-full rounded-md border-slate-300 font-mono uppercase shadow-sm focus:border-primary-500 focus:ring-primary-500"
          @change="saveSsid"
        >
        <button type="submit" class="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700">
          Übernehmen
        </button>
      </form>
    </AppPanel>

    <section>
      <h2 class="mb-1 text-base font-semibold">2. Gerät auswählen</h2>
      <p class="mb-3 text-sm text-slate-500">
        Tipp: Mit gedrückter Strg-Taste (Mac: Cmd) öffnet sich das Gerät in einem neuen Tab.
        So kannst du mehrere Geräte in einem Browser starten.
      </p>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="(info, role) in roles"
          :key="role"
          :to="`/device/${role}`"
          class="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-primary-500 hover:shadow"
        >
          <h3 class="font-semibold text-slate-800 group-hover:text-primary-700">{{ info.title }}</h3>
          <p class="mt-1 text-sm text-slate-600">{{ info.description }}</p>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script>
import { mapStores } from 'pinia'
import { useSessionStore } from '~/stores/session.js'
import { ROLES } from '~/simulation/roles.js'

export default {
  data() {
    return {
      roles: ROLES,
      ssid: '',
    }
  },
  computed: {
    ...mapStores(useSessionStore),
  },
  mounted() {
    this.ssid = this.sessionStore.ensureSsid()
  },
  methods: {
    saveSsid() {
      this.sessionStore.setSsid(this.ssid)
      this.ssid = this.sessionStore.ssid
    },
  },
}
</script>
