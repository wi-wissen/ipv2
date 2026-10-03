<template>
  <div v-if="roleInfo" class="space-y-4">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <h1 class="text-2xl font-bold">{{ roleInfo.title }}</h1>
      <span class="font-mono text-sm text-slate-600">{{ addresses }}</span>
      <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="connection.class">{{ connection.label }}</span>
      <form class="ml-auto flex items-center gap-2" @submit.prevent="changeSsid">
        <label for="ssid" class="text-sm text-slate-600">Netzwerkname</label>
        <input
          id="ssid"
          v-model="ssid"
          class="w-40 rounded-md border-slate-300 py-1 font-mono text-sm uppercase shadow-sm focus:border-primary-500 focus:ring-primary-500"
          @change="changeSsid"
        >
      </form>
    </div>

    <div v-if="device" class="grid gap-4 lg:grid-cols-2">
      <div class="space-y-4">
        <DeviceConfig :device="device" />
        <ArpTable :device="device" />
      </div>
      <div class="space-y-4">
        <DhcpSettings v-if="deviceStore.services.dhcp" />
        <DnsEntries v-if="deviceStore.services.dns" />
        <HttpPages v-if="deviceStore.services.http" />
        <WebBrowser :device="device" />
      </div>
      <LogConsole class="lg:col-span-2" />
    </div>
    <p v-else class="text-slate-500">Verbinde …</p>
  </div>
</template>

<script>
import { markRaw } from 'vue'
import { mapStores } from 'pinia'
import { useDeviceStore } from '~/stores/device.js'
import { useLogStore } from '~/stores/log.js'
import { useSessionStore } from '~/stores/session.js'
import Device from '~/simulation/Device.js'
import { isAssigned } from '~/simulation/address.js'
import { createMedium, defaultWebSocketUrl } from '~/simulation/media/index.js'
import { ROLES, isRole } from '~/simulation/roles.js'

const CONNECTION_STATES = {
  connecting: { label: 'Verbinde …', class: 'bg-slate-200 text-slate-700' },
  websocket: { label: 'Verbunden über den Server', class: 'bg-emerald-100 text-emerald-800' },
  'broadcast-channel': { label: 'Ohne Server: nur Tabs in diesem Browser', class: 'bg-amber-100 text-amber-800' },
  disconnected: { label: 'Verbindung zum Server unterbrochen', class: 'bg-red-100 text-red-800' },
}

export default {
  data() {
    return {
      device: null,
      medium: null,
      connectionState: 'connecting',
      ssid: '',
    }
  },
  computed: {
    ...mapStores(useDeviceStore, useLogStore, useSessionStore),
    role() {
      return this.$route.params.role
    },
    roleInfo() {
      return isRole(this.role) ? ROLES[this.role] : null
    },
    connection() {
      return CONNECTION_STATES[this.connectionState]
    },
    addresses() {
      return this.deviceStore.interfaces
        .map((nic) => `${isAssigned(nic.ip) ? nic.ip : 'keine IP'} · ${nic.mac}`)
        .join('  |  ')
    },
    // Änderungen, nach denen das Gerät "umgesteckt" werden muss
    wiring() {
      return this.deviceStore.interfaces.map((nic) => `${nic.segment}/${nic.mac}`).join(',')
    },
    ipAddresses() {
      return this.deviceStore.interfaces.map((nic) => nic.ip).join(',')
    },
  },
  watch: {
    wiring() {
      this.device?.reconnect()
    },
    ipAddresses() {
      this.device?.clearArpCaches()
    },
    'deviceStore.services': {
      deep: true,
      handler() {
        this.device?.syncServices()
      },
    },
    'sessionStore.ssid'(ssid) {
      this.device?.setSsid(ssid)
    },
  },
  async mounted() {
    if (!this.roleInfo) {
      this.$router.replace('/')
      return
    }
    if (this.deviceStore.role !== this.role) {
      this.deviceStore.applyRole(this.role)
    }
    this.ssid = this.sessionStore.ensureSsid()
    this.logStore.clear()

    const medium = await createMedium({
      url: this.$config.public.wsUrl || defaultWebSocketUrl(window.location),
      // Nur spätere Verbindungsabbrüche und -wiederaufnahmen melden
      onStatus: (status) => {
        if (!this.medium) return
        this.connectionState = status === 'connected' ? 'websocket' : 'disconnected'
        this.logConnection()
      },
    })
    this.medium = markRaw(medium)
    this.connectionState = medium.name
    this.logConnection()

    this.device = markRaw(new Device({
      config: this.deviceStore,
      medium,
      ssid: this.sessionStore.ssid,
      logger: (entry) => this.logStore.add(entry),
    }))
    this.device.start()
  },
  beforeUnmount() {
    this.device?.stop()
    this.medium?.close()
  },
  methods: {
    logConnection() {
      this.logStore.add({
        level: this.connectionState === 'websocket' ? 'success' : 'error',
        layer: 'system',
        protocol: 'Verbindung',
        message: this.connection.label,
      })
    },
    changeSsid() {
      this.sessionStore.setSsid(this.ssid)
      this.ssid = this.sessionStore.ssid
    },
  },
}
</script>
