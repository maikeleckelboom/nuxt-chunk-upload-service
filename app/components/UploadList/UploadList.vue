<script lang="ts" setup>
import type {QueueItem, UploadRecord} from "~/types/upload";

const props = withDefaults(defineProps<{
  items?: UploadRecord[];
}>(), {items: () => []});


const emit = defineEmits<{
  (type: 'resume', item: QueueItem, startChunk: number): void;
}>();

function resumeHandler(item: QueueItem, startChunk: number) {
  emit('resume', item, startChunk)
}
</script>

<template>
  <ul>
    <li v-for="item in items" :key="item.id">
      <UploadListItem :item="item" @resume="resumeHandler"/>
    </li>
  </ul>
</template>

<style scoped>

</style>