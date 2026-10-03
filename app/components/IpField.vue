<template>
  <label class="block">
    <span class="block text-sm font-medium text-slate-700">{{ label }}</span>
    <input
      :value="modelValue"
      type="text"
      :placeholder="placeholder"
      :aria-invalid="invalid"
      class="mt-1 block w-full rounded-md font-mono text-sm shadow-sm"
      :class="invalid ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500'"
      @change="update"
    >
    <span v-if="invalid" class="mt-1 block text-xs text-red-600">Format: Netz.Host, z. B. 10.5</span>
  </label>
</template>

<script>
import { isValidIp } from '~/simulation/address.js'

export default {
  props: {
    modelValue: { type: String, default: '' },
    label: { type: String, required: true },
    placeholder: { type: String, default: 'z. B. 10.5' },
  },
  emits: ['update:modelValue'],
  computed: {
    invalid() {
      return this.modelValue !== '' && !isValidIp(this.modelValue)
    },
  },
  methods: {
    update(event) {
      this.$emit('update:modelValue', event.target.value.trim())
    },
  },
}
</script>
