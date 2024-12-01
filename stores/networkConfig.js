import { defineStore } from 'pinia'

export const useNetworkConfigStore = defineStore('networkConfig', {
  state: () => ({
    mac: '',
    ip: '0.0',
    dns: '0.0',
    gateway: '0.0',
    isGatewayServer: false,
    isDhcpServer: false,
    isDnsServer: false,
    isHttpServer: false,
    dnsRecords: {},
    httpEntries: {}
  }),
  actions: {
    setMac(value) {
      this.mac = value
    },
    setIp(value) {
      this.ip = value;
      if(!this.ip) {
        this.ip = '0.0';
      }
    },
    setDns(value) {
        this.dns = value
    },
    setGateway(value) {
        this.gateway = value
    },
    setIsDhcpServer(value) {
      this.isDhcpServer = value
    },
    setIsDnsServer(value) {
      this.isDnsServer = value
    },
    setIsGatewayServer(value) {
      this.isGatewayServer = value
    },
    setIsHttpServer(value) {
      this.isHttpServer = value
    },
    clearAll() {
      this.ssid = ''
      this.mac = ''
      this.ip = ''
      this.isDhcpServer = false
      this.isDnsServer = false
      this.isHttpServer = false
    },
    addDnsRecord(domain, ip) {
        this.dnsRecords[domain] = ip
    },
    updateDnsRecord(domain, ip) {
        if (this.dnsRecords[domain]) {
            this.dnsRecords[domain] = ip
        }
    },
    removeDnsRecord(domain) {
        delete this.dnsRecords[domain]
    },
    clearDnsRecords() {
        this.dnsRecords = {}
    },
    hasDnsRecord(domain) {
        return domain in this.dnsRecords;
    },
    addHttpEntry(path, content) {
      this.httpEntries[path] = content
    },
    updateHttpEntry(path, content) {
        if (this.httpEntries[path]) {
            this.httpEntries[path] = content
        }
    },
    removeHttpEntry(path) {
        delete this.httpEntries[path]
    },
    clearHttpEntries() {
        this.httpEntries = {}
    },
    hasHttpEntry(path) {
        return path in this.httpEntries;
    },
  },
  persist: { // https://prazdevs.github.io/pinia-plugin-persistedstate/frameworks/nuxt-3.html#sessionstorage
    storage: persistedState.sessionStorage,
  },
})