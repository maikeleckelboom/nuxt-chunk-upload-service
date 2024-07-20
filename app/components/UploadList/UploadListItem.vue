<script lang="ts" setup>
import { type QueueItem, type UploadRecord } from '~/types/upload'

const props = defineProps<{
  item: UploadRecord
}>()

const emit = defineEmits<{
  (type: 'resume', item: QueueItem): void
}>()

function getProgress(item: UploadRecord): number {
  return (item.uploaded_chunks / item.total_chunks) * 100
}

function makeQueueItem(item: UploadRecord, file: File): QueueItem {
  return {
    file,
    status: 'queued',
    progress: getProgress(item),
    identifier: item.identifier
    // uploadedChunks: item.uploaded_chunks,
  }
}

const { open, onChange, reset } = useFileDialog({
  accept: '*',
  directory: false,
  multiple: false
})

onChange((files: FileList | null) => {
  const [file] = files || []
  if (!file) return
  emit('resume', makeQueueItem(props.item, file))
  nextTick(reset)
})
</script>

<template>
  <div class="my-4">
    <div class="flex flex-col justify-center gap-2 rounded border p-3">
      <div class="flex items-center justify-between gap-2">
        <strong>{{ item.file_name }}</strong>
      </div>
      <Progress :model-value="getProgress(item)" />
      <div class="flex items-center gap-2">
        <Button
          variant="secondary"
          @click="open"
        >
          <IconHammer class="mr-2 size-4" />
          Repair
        </Button>
      </div>
    </div>
  </div>
</template>
