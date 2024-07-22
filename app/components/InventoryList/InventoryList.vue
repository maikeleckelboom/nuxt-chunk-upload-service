<script lang="ts" setup>
import {
  type FileItem,
  isQueueItem,
  isUploadItem,
  type QueueItem,
  type UploadItem
} from '~/types/upload'
import type { ActionEventKey } from '~/utils/upload'

type Item = UploadItem | QueueItem | FileItem

const props = defineProps<{
  items: Item[]
}>()

const items = ref<Item[]>(props.items)

watch(
  () => props.items,
  (newItems) => {
    items.value = newItems
  }
)

const emit = defineEmits<{
  (type: ActionEventKey, item: QueueItem): void
}>()

function resume(item: QueueItem) {
  items.value = items.value.filter((i) => getKey(i) !== getKey(item))
  emit('resume', item)
}

function getKey(item: UploadItem | QueueItem | FileItem) {
  if (isQueueItem(item)) {
    return item.identifier
  }
  return item.id
}
</script>

<template>
  <ul class="grid gap-0.5">
    <li
      v-for="item in props.items"
      :key="getKey(item)"
    >
      <template v-if="isQueueItem(item)">
        <QueueListItem
          :item="item"
          @abort="emit('abort', item)"
          @pause="emit('pause', item)"
          @remove="emit('remove', item)"
          @resume="emit('resume', item)"
          @retry="emit('retry', item)"
        />
      </template>
      <template v-else-if="isUploadItem(item)">
        <UploadListItem
          :item="item"
          @resume="resume"
        />
      </template>
      <template v-else>
        <FileListItem :item="item" />
      </template>
    </li>
  </ul>
</template>

<style scoped></style>
