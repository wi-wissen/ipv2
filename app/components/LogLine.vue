<template>
  <span>
    <span class="text-slate-500">{{ time }}</span>
    <span class="ml-2 font-semibold" :class="color">{{ entry.protocol }}</span>
    <span class="ml-2">{{ entry.message }}</span>
    <span v-if="entry.data" class="ml-1 text-slate-500">▸</span>
  </span>
</template>

<script>
export default {
  props: {
    entry: { type: Object, required: true },
    color: { type: String, default: '' },
  },
  computed: {
    time() {
      return this.entry.time.toLocaleTimeString('de-DE')
    },
  },
}
</script>
