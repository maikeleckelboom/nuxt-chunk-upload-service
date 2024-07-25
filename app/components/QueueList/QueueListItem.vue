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
        <template v-if="item?.file">
          <strong>{{ item.file.name }}</strong>
        </template>
        <span class="font-semibold tabular-nums"> {{ Math.round(item.progress) }}% </span>
      </div>
      <div>
        <Progress v-model="item.progress" />
      </div>
      <div class="flex items-center gap-2">
        <template v-if="item?.file">
          <UploadControlButtons
            :item="item"
            @abort="emit('abort', item)"
            @pause="emit('pause', item)"
            @remove="emit('remove', item)"
            @resume="emit('resume', item)"
            @retry="emit('retry', item)"
          />
        </template>
        <template v-else>
          <!-- Repair -->
          <Button
            size="sm"
            variant="secondary"
            @click="emit('repair', item)"
          >
            Repair
            <IconHammer class="size-4 ml-2" />
          </Button>
          <!-- Remove -->
          <Button
            size="sm"
            variant="secondary"
            @click="emit('remove', item)"
          >
            Remove
            <IconTrash class="size-4 ml-2" />
          </Button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
