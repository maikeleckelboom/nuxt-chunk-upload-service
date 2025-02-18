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

const client = useSanctumClient()

async function deleteAll() {
  for (const item of props.items) {
    await client(`/file/${item.id}`, { method: 'DELETE',mode: 'cors' })
  }
}
</script>

<template>
<div>
  <button @click="deleteAll">Delete all</button>
  <ul>
    <li
      v-for="item in items"
      :key="item.id"
    >
      <FileListItem :item="item" />
    </li>
  </ul>
</div>
</template>
