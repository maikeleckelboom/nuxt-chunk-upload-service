<script setup lang="ts">
import type { FileItem } from '~/types/upload'

const props = defineProps<{
  item: FileItem
}>()
</script>

<template>
  <div v-if="item.mime_type.includes('image')" class="p-1">
    <p class="mb-1 tracking-tight font-semibold text-sm">{{ item.name }}</p>
    <NuxtImg :src="item.url" :alt="item.name" class="rounded" heighy="100"/>
  </div>
</template>

<style scoped></style>
