<template>
    <div class="flex flex-wrap items-center gap-4">
      <div class="flex-shrink-0">
        <label class="block text-sm font-medium text-gray-700">MAC-Adresse</label>
        <input
          type="text"
          :value="store.mac"
          readonly
          class="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm"
        >
      </div>
      <div class="flex-shrink-0">
        <label class="block text-sm font-medium text-gray-700">Netzwerk-SSID</label>
        <input
          type="text"
          v-model.lazy="ssid"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
      </div>
      <div class="flex-shrink-0">
        <label class="block text-sm font-medium text-gray-700">IP-Adresse</label>
        <input
          type="text"
          v-model.lazy="ip"
          pattern="^([1-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-4])\.([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-4])$"
          placeholder="z.B. 192.168"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
      </div>
      <div class="flex-shrink-0">
        <label class="block text-sm font-medium text-gray-700">DNS-Server</label>
        <input
          type="text"
          v-model.lazy="dns"
          pattern="^([1-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-4])\.([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-4])$"
          placeholder="z.B. 192.168"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
      </div>
      <div class="flex-shrink-0">
        <label class="block text-sm font-medium text-gray-700">Standart-Gateway</label>
        <input
          type="text"
          v-model.lazy="gateway"
          pattern="^([1-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-4])\.([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-4])$"
          placeholder="z.B. 192.168"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
      </div>
      <div class="flex items-center space-x-4">
        <label class="inline-flex items-center">
          <input type="checkbox" v-model="isGatewayServer" class="form-checkbox h-5 w-5 text-indigo-600">
          <span class="ml-2 text-sm text-gray-700">Gateway</span>
        </label>
        <label class="inline-flex items-center">
          <input type="checkbox" v-model="isDhcpServer" class="form-checkbox h-5 w-5 text-indigo-600">
          <span class="ml-2 text-sm text-gray-700">DHCP</span>
        </label>
        <label class="inline-flex items-center">
          <input type="checkbox" v-model="isDnsServer" class="form-checkbox h-5 w-5 text-indigo-600">
          <span class="ml-2 text-sm text-gray-700">DNS</span>
        </label>
        <label class="inline-flex items-center">
          <input type="checkbox" v-model="isHttpServer" class="form-checkbox h-5 w-5 text-indigo-600">
          <span class="ml-2 text-sm text-gray-700">HTTP</span>
        </label>
      </div>
    </div>
  </template>
  
  <script>
  import { mapState, mapActions } from 'pinia'
  
  export default {
    props: {
      socket: {
        type: Object,
        default: () => ({})
      },
    },
    computed: {
      store() {
        return useNetworkConfigStore();
      },
      sessionStore() {
        return useSessionConfigStore();
      },
      ssid: {
        get() {
          return this.sessionStore.ssid
        },
        set(value) {
          this.sessionStore.setSsid(value);
          this.socket.physical.initializeChannels(); // subscript new pusher channel
        }
      },
      ip: {
        get() {
          return this.store.ip
        },
        set(value) {
          this.store.setIp(value);
          if(! value) {
            this.socket.applicationLayer.dhcp.requestIP(); // try to get new ip
          }
        }
      },
      gateway: {
        get() {
          return this.store.gateay
        },
        set(value) {
          this.store.setGateway(value)
        }
      },
      dns: {
        get() {
          return this.store.dns
        },
        set(value) {
          this.store.setDns(value)
        }
      },
      isDhcpServer: {
        get() {
          return this.store.isDhcpServer
        },
        set(value) {
          this.store.setIsDhcpServer(value)
        }
      },
      isDnsServer: {
        get() {
          return this.store.isDnsServer
        },
        set(value) {
          this.store.setIsDnsServer(value)
        }
      },
      isHttpServer: {
        get() {
          return this.store.isHttpServer
        },
        set(value) {
          this.store.setIsHttpServer(value)
        }
      },
      isGatewayServer: {
        get() {
          return this.store.isGatewayServer
        },
        set(value) {
          this.store.setIsGatewayServer(value)
        }
      },
    },
  }
  </script>