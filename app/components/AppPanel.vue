<template>
  <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <header class="mb-3">
      <h2 class="text-base font-semibold text-slate-800">{{ title }}</h2>
      <p v-if="description" class="text-sm text-slate-500">{{ description }}</p>
    </header>
    <slot />
  </section>
</template>

<script>
export default {
  props: {
    title: { type: String, required: true },
    description: { type: String, default: '' },
  },
}
</script>
