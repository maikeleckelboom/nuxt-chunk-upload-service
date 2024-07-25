<script setup lang="ts">
import type { FileItem } from '~/types/upload'

const props = defineProps<{
  item: FileItem
}>()
</script>

<template>
  <div  class="p-1">
    <p class="mb-1 tracking-tight font-semibold text-sm">{{ item.name }}</p>
    <template v-if="item.mime_type.includes('image')">
      <NuxtImg :src="item.url" :alt="item.name" class="rounded" />
    </template>
    <template v-if="item.mime_type.includes('video')">
      <video :src="item.url" controls class="rounded"></video>
    </template>
    <template v-if="item.mime_type.includes('audio')">
      <audio controls class="w-full" :src="item.url">
      </audio>
    </template>
    <template v-else>
      <pre>{{ item}}</pre>
    </template>
  </div>
</template>

<style scoped></style>
