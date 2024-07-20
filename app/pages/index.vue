<script setup lang="ts">

</script>

<template>
  <div class="container px-2 py-4">
    <div class="mb-4">
      <h1 class="text-3xl font-semibold tracking-tight leading-relaxed">
        Rocket Man <span class="ml-1">🚀</span>
      </h1>
      <p class="text-muted-foreground">
        A simple and fast way to create your own website.
      </p>
    </div>
    <div class="space-x-2">
      <Button variant="outline">
        Get Started
      </Button>
      <NuxtLink to="/queue">
        <Button variant="default">
          Upload
        </Button>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>

</style>