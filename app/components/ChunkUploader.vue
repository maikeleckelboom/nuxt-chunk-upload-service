<script setup lang="ts">
const client = useSanctumClient();
const fileInput = ref<null | HTMLInputElement>(null);

const uploadChunk = async (file: File, chunk: Blob, totalChunks: number, currentChunk: number) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('totalChunks', totalChunks.toString());
  formData.append('currentChunk', currentChunk.toString());

  const response = await client('/upload-chunk', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Chunk upload failed');
  }
};

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (!target.files?.length) return;
  const [file] = target.files;
  const chunkSize = 1024 * 1024; // 1MB
  const totalChunks = Math.ceil(file.size / chunkSize);
  let startByte = 0;

  for (let i = 0; i < totalChunks; i++) {
    const endByte = Math.min(startByte + chunkSize, file.size);
    const chunk = file.slice(startByte, endByte);
    await uploadChunk(file, chunk, totalChunks, i);
    startByte = endByte;
  }
  console.log('Upload complete');
};
</script>


<template>
  <div>
    <input type="file" @change="handleFileChange" ref="fileInput"/>
  </div>
</template>