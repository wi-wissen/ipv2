import { defineStore } from 'pinia'

export const useSessionConfigStore = defineStore('sessionConfig', {
  state: () => ({
    ssid: '',
  }),
  actions: {
    setSsid(value) {
      this.ssid = value
    },
  },
  persist: { // https://prazdevs.github.io/pinia-plugin-persistedstate/frameworks/nuxt-3.html#localstorage
    storage: persistedState.localStorage,
  },
})