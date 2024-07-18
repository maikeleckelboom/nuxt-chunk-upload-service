<script setup lang="ts">
import {nanoid} from "nanoid";
import {FetchError} from "ofetch";

const client = useSanctumClient();

const queue = ref<Set<File>>(new Set());
const progress = ref<number>(0);
const PARALLEL_UPLOADS: number = 3 as const;

watch(queue, async (files) => {
  if (queue.value.size > 0) {
    const uploads = Array.from(queue.value).slice(0, PARALLEL_UPLOADS);
    console.log('New Batch: ', uploads);
    const results = await Promise.all(uploads.map(upload));
    console.log('🔥: ', results);
  }
}, {immediate: true, deep: true});


const identifiers = useCookie<string[] | null>('identifiers', {
  default: () => null,
  sameSite: 'strict',
});


async function upload() {
  const file = queue.value.values().next().value;
  queue.value.delete(file);
  progress.value = 0;

  const identifier = nanoid(8);
  const chunkSize = (1024 * 1024) * 2;
  const totalChunks = Math.ceil(file.size / chunkSize)

  for (let i = 0; i < totalChunks; i++) {
    const chunkNumber = i + 1;
    const currentChunk = file.slice(i * chunkSize, chunkNumber * chunkSize);

    const formData = new FormData();
    formData.append('filename', file.name);
    formData.append('identifier', identifier);
    formData.append('totalChunks', totalChunks.toString());
    formData.append('chunkNumber', chunkNumber.toString());
    formData.append('currentChunk', currentChunk);
    formData.append('chunkSize', chunkSize.toString()); // Opt
    formData.append('totalSize', file.size.toString()); // Opt

    try {
      const response = await client('/upload', {
        method: 'POST',
        body: formData
      });
      progress.value = response.progress ?? 0;
    } catch (e: FetchError) {
      console.warn('An error occurred', e.message)
    }
  }
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