<script setup lang="ts">
function handleError(error: Error) {
  console.error(error)
}
</script>

<template>
  <div>
    <NuxtRouteAnnouncer/>
    <NuxtErrorBoundary @error="handleError">
      <NuxtPage/>
    </NuxtErrorBoundary>
  </div>
</template>

