<script setup lang="ts">

async function untitledAction() {
  console.log('Hello, World!')
}
</script>

<template>
  <div class="container px-2 py-4">
    <div class="mb-4">
      <h1 class="text-3xl font-semibold tracking-tight leading-relaxed">
        ChunkDrive 1.0
      </h1>
      <p class="text-muted-foreground">
        Upload large files with ease; ChunkDrive will take care of the rest.
      </p>
    </div>
    <div class="space-x-2">
      <Button variant="outline"
              @click="untitledAction">
        Search
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