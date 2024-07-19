<script setup lang="ts">
const client = useSanctumClient();

const {data, status, error, refresh} = await useAsyncData('files', async () => {
  return await client('/files');
});


</script>

<template>
  <div>
    <div class="mb-4 flex flex-col gap-2">
      <h1 class="text-2xl font-semibold tracking-tight leading-relaxed">
        Uploaded Files
      </h1>
      <Button @click="refresh" class="w-fit" variant="outline">Refresh</Button>
    </div>
    <template v-if="status === 'pending'">Loading...</template>
    <template v-else-if="status === 'error'">{{ error }}</template>
    <template v-else-if="status === 'success'">
      <template v-if="data.length === 0">No files uploaded yet.</template>
      <template v-else>
        <ul>
          <li v-for="file in data" :key="file.id">
            <pre>{{ file }}</pre>
          </li>
        </ul>
      </template>
    </template>
  </div>
</template>

<style scoped>

</style>