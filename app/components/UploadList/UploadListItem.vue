<script lang="ts" setup>
import {type QueueItem, type UploadRecord} from "~/types/upload";

const props = defineProps<{
  item: UploadRecord;
}>();

const emit = defineEmits<{
  (type: 'resume', item: QueueItem, startChunk: number): void;
}>();

function getProgress(item: UploadRecord) {
  const repairedProgress = (item.uploaded_chunks / item.total_chunks) * 100;
  console.log(repairedProgress);
  return repairedProgress;
}

const CHUNK_SIZE: number = (1024 * 1024) * 2

function repairUpload(item: UploadRecord, file: File): QueueItem {
  const startChunk = item.uploaded_chunks;
  console.log('startChunk', startChunk);
  return {
    file,
    status: 'queued',
    progress: getProgress(item),
    identifier: item.identifier,
    uploadedChunks: item.uploaded_chunks,
  }
}

const {open, onChange, reset} = useFileDialog({
  accept: '*',
  directory: false,
  multiple: false
})

onChange((files: FileList | null) => {
  const [file] = files || [];
  if (!file) return;
  const repaired = repairUpload(props.item, file);
  emit('resume', repaired, props.item.uploaded_chunks);
  nextTick(reset)
});

</script>

<template>
  <div class="my-4">
    <div class="flex flex-col justify-center gap-2 p-3 rounded border">
      <div class="flex justify-between items-center gap-2">
        <strong>{{ item.file_name }}</strong>
      </div>
      <Progress :model-value="getProgress(item)"/>
      <div class="flex items-center gap-2">
        <Button variant="secondary" @click="open">
          <IconHammer class="size-4 mr-2"/>
          Repair
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>