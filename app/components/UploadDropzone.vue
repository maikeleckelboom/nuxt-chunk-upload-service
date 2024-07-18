<script lang="ts" setup>
const emit = defineEmits<{
  (ev: 'change', files: FileList | File[]): void
}>()

function handleEmit(files: FileList | File[]) {
  emit('change', files)
}

const dropZoneRef = ref<HTMLDivElement>()

function onDrop(files: FileList | File[] | null) {
  if (!files) return
  handleEmit(files)
}

const {isOverDropZone} = useDropZone(dropZoneRef, {
  onDrop
})

const {files, open, onChange} = useFileDialog({
  accept: '*',
  directory: false,
})

onChange((files) => {
  if (!files) return
  handleEmit(files)
})
</script>

<template>
  <div ref="dropZoneRef" :class="cn(
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
      <Button variant="secondary" @click="open()">
        Browse Files
      </Button>
    </div>
  </div>
</template>