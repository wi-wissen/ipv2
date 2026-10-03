<template>
  <div class="min-h-screen bg-slate-100 text-slate-800">
    <NuxtRouteAnnouncer />
    <header class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <NuxtLink to="/" class="text-lg font-bold text-primary-700">IPv2</NuxtLink>
        <span class="text-sm text-slate-500">Netzwerksimulation für den Informatikunterricht</span>
      </div>
    </header>
    <main class="mx-auto max-w-7xl px-4 py-6">
      <NuxtPage />
    </main>
  </div>
</template>
