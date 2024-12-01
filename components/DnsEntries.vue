<!-- DnsEntries.vue -->
<template>
    <div class="mt-4">
      <h2 class="text-lg font-semibold mb-2">DNS Einträge</h2>
      <div class="overflow-x-auto">
        <table class="min-w-full bg-white">
          <thead class="bg-gray-100">
            <tr>
              <th class="text-left py-2 px-4">Domain</th>
              <th class="text-left py-2 px-4">IP-Adresse</th>
              <th class="text-left py-2 px-4">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(ip, domain) in dnsRecords" :key="domain" class="border-b">
              <td class="py-2 px-4">
                <input 
                  :value="domain" 
                  class="border rounded px-2 py-1 w-full bg-gray-300"
                  disabled
                />
              </td>
              <td class="py-2 px-4">
                <input 
                  v-model="dnsRecords[domain]" 
                  class="border rounded px-2 py-1 w-full"
                />
              </td>
              <td class="py-2 px-4 flex space-x-2">
                <button
                  @click="deleteEntry(domain)"
                  class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                >
                  Löschen
                </button>
              </td>
            </tr>
            <!-- Neue Zeile zum Hinzufügen eines Eintrags -->
            <tr class="border-b">
              <td class="py-2 px-4">
                <input 
                  v-model="newDomain"
                  placeholder="Neue Domain"
                  class="border rounded px-2 py-1 w-full"
                />
              </td>
              <td class="py-2 px-4">
                <input 
                  v-model="newIp"
                  placeholder="Neue IP-Adresse"
                  class="border rounded px-2 py-1 w-full"
                />
              </td>
              <td class="py-2 px-4">
                <button
                  @click="addEntry"
                  class="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  Hinzufügen
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </template>
  
  <script>
  import { useNetworkConfigStore } from '~/stores/networkConfig'

  export default {
    props: {
      socket: {
        type: Object,
        required: true
      }
    },
    data() {
      return {
        newDomain: '',
        newIp: ''
      }
    },
    computed: {
      store() {
        return useNetworkConfigStore()
      },
      dnsRecords() {
        return this.store.dnsRecords
      }
    },
    mounted() {
      this.initializeEntries()
    },
    methods: {
      initializeEntries() {
        if (!this.store.hasDnsRecord('dns.local')) {
          this.store.addDnsRecord('dns.local', this.store.ip)
        }
      },
      addEntry() {
        if (this.newDomain && this.newIp) {
          this.store.addDnsRecord(this.newDomain, this.newIp)
          this.newDomain = ''
          this.newIp = ''
        }
      },
      deleteEntry(domain) {
        this.store.removeDnsRecord(domain)
      }
    }
  }
  </script>