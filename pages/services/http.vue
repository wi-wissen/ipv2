<script>
import Socket from '~/services/Socket.js'

export default {
  data() {
    return {
      socket: new Socket({sessionStore: useSessionConfigStore(), networkStore: useNetworkConfigStore(), logStorage: useLogStore(), isHttpServer: true})
    }
  },
  methods: {
    updateSocket(property, value) {
      this.socket[property] = value
    }
  },
  watch: {
    socket: {
      handler(newSocket) {
        console.log('Socket object changed:', newSocket)
        // Hier können Sie weitere Aktionen ausführen, wenn sich der Socket ändert
      },
      deep: true
    }
  },
  mounted() {
    this.socket.connect()
  },
  beforeUnmount() {
    this.socket.disconnect()
  }
}
</script>

<template>
  <div>
    <h1 class="text-primary-700 font-bold">HTTP</h1>
    <Config v-if="socket" v-model:socket="socket" />
    <HttpEntries />
    <Console v-model:socket="socket" />
    
    <!-- Beispiel für die Interaktion mit dem Socket -->
    <button @click="updateSocket('someProperty', 'newValue')">Update Socket</button>
  </div>
</template>