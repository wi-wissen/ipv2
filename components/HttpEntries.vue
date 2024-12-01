<!-- HttpEntries.vue -->
<template>
    <div class="mt-4">
      <h2 class="text-lg font-semibold mb-2">HTTP Einträge</h2>
      <div class="overflow-x-auto">
        <table class="min-w-full bg-white">
          <thead class="bg-gray-100">
            <tr>
              <th class="text-left py-2 px-4">Pfad</th>
              <th class="text-left py-2 px-4">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(entry, path) in httpEntries" :key="path">
              <tr class="border-b">
                <td class="py-2 px-4">
                  <input
                    :value="path"
                    class="border rounded px-2 py-1 w-full bg-gray-300"
                    disabled
                  />
                </td>
                <td class="py-2 px-4 flex space-x-2">
                  <button
                    @click="deleteEntry(path)"
                    class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                  >
                    Löschen
                  </button>
                </td>
              </tr>
              <tr class="border-b">
                <td colspan="2" class="py-2 px-4">
                  <textarea
                    v-model="httpEntries[path]"
                    class="border rounded px-2 py-1 w-full"
                    rows="3"
                  ></textarea>
                </td>
              </tr>
            </template>
            <!-- Neue Zeile zum Hinzufügen eines Eintrags -->
            <tr class="border-b">
              <td class="py-2 px-4">
                <input
                  v-model="newPath"
                  placeholder="Neuer Pfad"
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
            <tr v-if="newPath" class="border-b">
              <td colspan="2" class="py-2 px-4">
                <textarea
                  v-model="newResponse"
                  placeholder="Neue Antwort"
                  class="border rounded px-2 py-1 w-full"
                  rows="3"
                ></textarea>
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
        newPath: '',
        newResponse: ''
      }
    },
    computed: {
      store() {
        return useNetworkConfigStore()
      },
      httpEntries() {
        return this.store.httpEntries
      }
    },
    mounted() {
      this.initializeEntries()
    },
    methods: {
      initializeEntries() {
        if (!this.store.hasHttpEntry('/')) {
          this.store.addHttpEntry('/', 'Welcome to the default page')
        }
      },
      addEntry() {
        if (this.newPath && this.newResponse) {
          this.store.addHttpEntry(this.newPath, this.newResponse)
          this.newPath = ''
          this.newResponse = ''
        }
      },
      deleteEntry(path) {
        this.store.removeHttpEntry(path)
      }
    }
  }
  </script>