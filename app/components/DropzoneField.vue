<script setup lang="ts">
const props = defineProps<{
  isOverDropZone?: boolean
}>()

const emit = defineEmits<{
  open: []
}>()
</script>

<template>
  <div :class="cn(
      'h-52 w-full grid place-items-center rounded border-dashed border-2',
      isOverDropZone ? 'bg-muted-foreground/10 border-primary text-primary animate-pulse' : 'text-muted-foreground'
  )">
    <div class="text-center text-muted-foreground grid place-items-center text-balance">
      <IconFileMusic class="size-8 mb-2"/>
      <div class="mb-3">
        <p v-if="isOverDropZone" class="text-primary">
          Release to upload
        </p>
        <p v-else>
          Drag or upload your audio file to get started.
        </p>
      </div>
      <Button variant="secondary" @click="emit('open')">
        Browse Files
      </Button>
    </div>
  </div>
</template>

<style scoped>

</style>