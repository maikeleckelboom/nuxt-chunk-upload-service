<script lang="ts" setup>
import {matches} from "~/utils/matches";
import {type QueueItem} from "~/types/upload";

const props = defineProps<{
  item: QueueItem;
}>();

type EmitKey = 'pause' | 'resume' | 'abort' | 'retry';

const emit = defineEmits<{
  (type: EmitKey, item: QueueItem): void;
}>();

async function sendEmit(type: EmitKey, item: QueueItem) {
  emit(type, item);
}
</script>

<template>
  <div class="my-4">
    <div class="flex flex-col justify-center gap-2 p-3 rounded border">
      <div class="flex justify-between items-center gap-2">
        <strong>{{ item.file.name }}</strong>
        <span class="tabular-nums font-semibold">{{ Math.round(item.progress) }}%</span>
      </div>
      <div v-if="matches(item.status, 'pending', 'paused')">
        <Progress v-model="item.progress"/>
      </div>
      <div class="flex items-center gap-2">
        <UploadControlButtons
            :item="item"
            @abort="sendEmit('abort', item)"
            @pause="sendEmit('pause', item)"
            @resume="sendEmit('resume', item)"
            @retry="sendEmit('retry', item)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>