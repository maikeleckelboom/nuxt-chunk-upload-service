<script lang="ts" setup>
import { type QueueItem } from '~/types/upload'
import type { ActionEventKey } from '~/utils/upload'

const props = defineProps<{
  item: QueueItem
}>()

const emit = defineEmits<{
  (type: ActionEventKey, item: QueueItem): void
}>()
</script>

<template>
  <div class="my-4">
    <div class="flex flex-col justify-center gap-2 rounded border p-3">
      <div class="flex items-center justify-between gap-2">
        <strong>{{ item.file.name }}</strong>
        <span class="font-semibold tabular-nums"> {{ Math.round(item.progress) }}% </span>
      </div>
      <div>
        <Progress v-model="item.progress" />
      </div>
      <div class="flex items-center gap-2">
        <UploadControlButtons
          :item="item"
          @abort="emit('abort', item)"
          @pause="emit('pause', item)"
          @remove="emit('remove', item)"
          @resume="emit('resume', item)"
          @retry="emit('retry', item)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped></style>
