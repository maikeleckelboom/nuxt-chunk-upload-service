<script lang="ts" setup>
import type { QueueItem, UploadItem } from '~/types/upload'

const props = withDefaults(
  defineProps<{
    items?: UploadItem[]
  }>(),
  { items: () => [] }
)

const emit = defineEmits<{
  (type: 'resume', item: QueueItem): void
}>()

function resumeHandler(item: QueueItem) {
  emit('resume', item)
}
</script>

<template>
  <ul>
    <li
      v-for="item in items"
      :key="item.id"
    >
      <UploadListItem
        :item="item"
        @resume="resumeHandler"
      />
    </li>
  </ul>
</template>

<style scoped></style>
