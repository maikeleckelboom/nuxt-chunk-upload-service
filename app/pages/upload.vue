<script setup lang="ts">
const client = useSanctumClient();

const elFile = ref<HTMLInputElement | null>(null);

const uploadQueue = ref<Set<File>>(new Set());

const onFileChange = () => {
  const files = elFile.value?.files;
  if (!files?.length) return
  for (let i = 0; i < files.length; i++) {
    uploadQueue.value.add(files[i]);
  }
};

const onProcess = async () => {
  const file = uploadQueue.value.values().next().value;
  if (!file) return;
  const fileSize = file.size;
  const filename = file.name;
  const chunkSize = 1024 * 1024;
  const totalChunks = Math.ceil(fileSize / chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const chunkData = file.slice(i * chunkSize, (i + 1) * chunkSize);
    const formData = new FormData();
    formData.append('filename', filename);
    formData.append('currentChink', chunkData);
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