<script setup lang="ts">
import type {FetchError} from "ofetch";
import {nanoid} from "nanoid";

const PARALLEL_UPLOADS: number = 5 as const;

const queue = ref<Set<File>>(new Set());
const progress = ref<number>(0);

watch(queue, async () => {
  if (queue.value.size < 1) {
    progress.value = 0;
    return;
  }

  if (queue.value.size > PARALLEL_UPLOADS) {
    const uploads = Array.from(queue.value).slice(0, PARALLEL_UPLOADS);
    await Promise.all(uploads.map(upload));
  } else {
    await upload();
  }
}, {deep: true})

const client = useSanctumClient();

async function upload() {
  const file = queue.value.values().next().value;
  progress.value = 0;

  const identifier = nanoid(8);
  const chunkSize = (1024 * 1024) * 2;
  const totalChunks = Math.ceil(file.size / chunkSize)

  for (let i = 0; i < totalChunks; i++) {
    const formData = new FormData();
    const chunkNumber = i + 1;
    const currentChunk = file.slice(i * chunkSize, chunkNumber * chunkSize);
    formData.append('identifier', identifier);
    formData.append('filename', file.name);
    formData.append('totalSize', file.size.toString());
    formData.append('chunkNumber', chunkNumber.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('currentChunk', currentChunk);

    try {
      const response = await client('/upload', {
        method: 'POST',
        body: formData
      });
      progress.value = response.progress ?? 100;
    } catch (e: FetchError) {
      console.warn('An error occurred', e.message)
    }
  }

  queue.value.delete(file);
}

const onFileChange = (files: FileList | File[]) => {
  for (let i = 0; i < Array.from(files).length; i++) {
    queue.value.add(files[i]);
  }
};
</script>

<template>
  <div class="container px-12 py-4">
    <div class="mb-4">
      <h1 class="text-2xl font-semibold tracking-tight leading-relaxed">
        Upload Files
      </h1>
      <p class="text-muted-foreground text-sm">
        Resume file upload with chunking.
      </p>
    </div>
    <Progress v-model="progress" class="mb-4"/>
    <UploadDropzone @change="onFileChange"/>
  </div>
</template>

<style scoped>

</style>