<script lang="ts" setup>
import type { FileItem } from '~/types/upload'

const props = withDefaults(
  defineProps<{
    items?: FileItem[]
  }>(),
  {
    items: () => []
  }
)
</script>

<template>
  <ul>
    <li
      v-for="item in items"
      :key="item.id"
    >
      <FileListItem :item="item" />
    </li>
  </ul>
</template>
