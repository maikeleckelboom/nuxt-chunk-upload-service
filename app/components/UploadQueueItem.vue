<script setup lang="ts">
interface UploadQueueItem {
  file: File;
  status: 'queued' | 'paused' | 'pending' | 'failed' | 'completed';
  progress: number;
  identifier: string;
  controller?: AbortController;
}

const props = defineProps<{
  item: UploadQueueItem;
}>();

type EmitKey = 'pause' | 'resume' | 'abort' | 'retry';

const emit = defineEmits<{
  (type: EmitKey, item: UploadQueueItem): void;
}>();

async function sendEmit(type: EmitKey, item: UploadQueueItem) {
  emit(type, item);
}


</script>

<template>
  <div class="my-4">
    <div class="flex flex-col justify-center gap-2 text-xs p-3 rounded border">
      <div class="flex items-center gap-2">
        <strong class="text-base">{{ item.file.name }}</strong>
        <span v-if="item.status === 'pending'">{{ item.progress }}%</span>
      </div>
      <div v-if="item.status === 'pending'">
        <Progress v-model="item.progress"/>
      </div>
      <div class="flex items-center gap-2">
        <Button @click="sendEmit('pause', item)" v-if="item.status === 'pending'">
          Pause
        </Button>
        <Button @click="sendEmit('resume', item)" v-if="item.status === 'paused'">
          Resume
        </Button>
        <Button @click="sendEmit('abort', item)" v-if="item.status === 'pending' || item.status === 'paused'">
          Abort
        </Button>
        <Button @click="sendEmit('retry', item)" v-if="item.status === 'failed'">
          Retry
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>