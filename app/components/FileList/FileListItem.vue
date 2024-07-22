<script setup lang="ts">
import type { FileItem } from '~/types/upload'

const props = defineProps<{
  item: FileItem
}>()
</script>

<template>
  <div>
    <pre>{{ item }}</pre>
  </div>
</template>

<style scoped></style>
