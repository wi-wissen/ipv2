<script>
import Socket from '~/services/Socket.js'

export default {
  data() {
    return {
      socket: null,
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
  async mounted() {
    this.socket = new Socket({sessionStore: useSessionConfigStore(), networkStore: useNetworkConfigStore(), logStorage: useLogStore()});
    await this.socket.connect();
    console.log('connected');

    const ip = await this.socket.application.dns.lookup('http.local');
    console.log(ip);

    const response = await this.socket.application.http.get(ip, 'http://http.local/');
    console.log(response);
  },
  beforeUnmount() {
    if(this.socket instanceof Socket) {
      this.socket.disconnect()
    }
  }
}
</script>

<template>
  <div>
    <h1 class="text-primary-700 font-bold">Browser</h1>
    <Config  v-if="socket" v-model:socket="socket"/>
    <Console v-if="socket"  :key="socket.logs.length" v-model:socket="socket" />
    
    <!-- Beispiel für die Interaktion mit dem Socket -->
    <button @click="updateSocket('someProperty', 'newValue')">Update Socket</button>
  </div>
</template>