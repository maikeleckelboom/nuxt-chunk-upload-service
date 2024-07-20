<script setup lang="ts">
import type {FileRecord} from "~/types/upload";

const props = defineProps<{
  item: FileRecord
}>();
</script>

<template>
<div>
  <pre>{{item}}</pre>
</div>
</template>

<style scoped>

</style>