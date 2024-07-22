<script generic="T extends QueueItem | UploadItem" lang="ts" setup>
import type { QueueItem, UploadItem } from '~/types/upload'

const props = defineProps<{
  item: T
}>()

type EmitKey = 'pause' | 'resume' | 'abort' | 'retry' | 'remove'

const emit = defineEmits<{
  (type: EmitKey, item: T): void
}>()

async function sendEmit(type: EmitKey, item: T) {
  emit(type, item)
}
</script>

<template>
  <div class="flex items-center gap-2">
    <Button
      v-if="matches(props.item.status, 'pending', 'queued')"
      @click="sendEmit('pause', props.item)"
    >
      Pause
    </Button>
    <Button
      v-if="matches(props.item.status, 'paused')"
      @click="sendEmit('resume', props.item)"
    >
      Resume
    </Button>
    <Button
      v-if="matches(props.item.status, 'pending', 'queued', 'paused')"
      @click="sendEmit('abort', props.item)"
    >
      Abort
    </Button>
    <Button
      v-if="matches(props.item.status, 'failed')"
      @click="sendEmit('retry', props.item)"
    >
      Retry
    </Button>
    <Button
      v-if="matches(props.item.status, 'failed', 'paused')"
      @click="sendEmit('remove', props.item)"
    >
      Remove
    </Button>
  </div>
</template>
