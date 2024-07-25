<script lang="ts" setup>
import type { QueueItem } from '~/types/upload'
import type { ActionEventKey } from '~/utils/upload'

const props = withDefaults(
  defineProps<{
    items?: QueueItem[]
  }>(),
  {
    items: () => []
  }
)

const emit = defineEmits<{
  (type: ActionEventKey, item: QueueItem): void
}>()
</script>

<template>
  <ul>
    <li
      v-for="item in items"
      :key="item.identifier"
    >
      <QueueListItem
        :item="item"
        @abort="emit('abort', item)"
        @pause="emit('pause', item)"
        @remove="emit('remove', item)"
        @resume="emit('resume', item)"
        @retry="emit('retry', item)"
        @repair="emit('repair', item)"
      />
    </li>
  </ul>
</template>

<style scoped></style>
