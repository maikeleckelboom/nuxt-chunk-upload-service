<script setup lang="ts">
const client = useSanctumClient();

const elFile = ref<HTMLInputElement | null>(null);

const uploadQueue = ref<Set<File>>(new Set());

const onFileChange = (files: FileList | File[]) => {
  for (let i = 0; i < Array.from(files).length; i++) {
    uploadQueue.value.add(files[i]);
  }
};

const onProcess = async () => {
  const file = uploadQueue.value.values().next().value;
  if (!file) return;
  const chunkSize = (1024 * 1024) * 2;
  const totalChunks = Math.ceil(file.size / chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const currentChunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
    const formData = new FormData();
    formData.append('filename', file.name);
    formData.append('currentChunk', currentChunk);
    formData.append('totalChunks', totalChunks);
    formData.append('chunkIndex', i);

    const response = await client('/upload-chunk', {
      method: 'POST',
      body: formData,
    });

    console.log(response, 'response');
  }

  uploadQueue.value.delete(file);

  if (uploadQueue.value.size > 0) {
    return onProcess();
  } else {
    console.log('All files uploaded');
  }
};

watch(uploadQueue, (queue) => {
  if (queue.size > 0) {
    console.log('Processing files', queue);
    onProcess();
  } else {
    console.log('No files to process');
  }
}, {deep: true});
</script>

<template>
  <div class="container">
    <div class="container px-2 py-4">
      <div class="mb-4">
        <h1 class="text-3xl font-semibold tracking-tight leading-relaxed">
          Batch Upload
        </h1>
      </div>
      <UploadDropzone @change="onFileChange"/>
    </div>
  </div>
</template>

<style scoped>

</style>