<template>
  <div>
    <NuxtRouteAnnouncer />
  </div>
  <NuxtPage />
</template>

<script>
export default {
  data() {
    return {
      // Hier können Sie bei Bedarf reaktive Daten definieren
    }
  },

  mounted() {
    // add new global console function
    console.success = function(message) {
      console.log('%c' + message, 'color: green; font-weight: bold;');
    };
  },
}
</script>