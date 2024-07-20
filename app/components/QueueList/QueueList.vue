<script lang="ts" setup>
import type {QueueItem} from "~/types/upload";

const props = withDefaults(defineProps<{
  items?: QueueItem[];
}>(), {
  items: () => [],
});

type EmitKey = 'pause' | 'resume' | 'abort' | 'retry';

const emit = defineEmits<{
  (type: EmitKey, item: QueueItem): void;
}>();

async function sendEmit(type: EmitKey, item: QueueItem) {
  emit(type, item);
}
</script>

<template>
  <ul>
    <li v-for="item in items" :key="item.identifier">
      <QueueListItem
          :item="item"
          @abort="sendEmit('abort', item)"
          @pause="sendEmit('pause', item)"
          @resume="sendEmit('resume', item)"
          @retry="sendEmit('retry',item)"
      />
    </li>
  </ul>
</template>

<style scoped>

</style>