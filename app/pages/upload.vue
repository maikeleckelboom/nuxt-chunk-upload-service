<script setup lang="ts">
import type {FetchError} from "ofetch";
import {nanoid} from "nanoid";

const PARALLEL_UPLOADS: number = 2 as const;

interface QueueItem {
  file: File;
  status: 'queued' | 'uploading' | 'completed' | 'error';
  progress: number;
  controller?: AbortController;
}

const queueMap = ref<Map<string, QueueItem>>(new Map());

const progress = computed<number>(() => {
  if (queueMap.value.size === 0) {
    return 0;
  }

  return Math.floor(((totalFilesToUpload.value - queueMap.value.size) / totalFilesToUpload.value) * 100);
})

const client = useSanctumClient();

async function upload(file: File, identifier: string) {

  const controller = new AbortController();

  queueMap.value.set(identifier, {
    file,
    controller,
    status: 'uploading',
    progress: 0
  });

  console.log('Uploading file', queueMap.value.get(identifier));

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
        body: formData,
        signal: controller.signal
      });

      queueMap.value.set(identifier, {
        file,
        controller,
        progress: response.progress,
        status: response.status === 201 ? 'completed' : 'uploading'
      });

    } catch (e: FetchError) {

      console.warn('An error occurred', e.message)

      queueMap.value.set(identifier, {
        file,
        controller,
        status: 'error',
        progress: queueMap.value.get(identifier)?.progress || 0
      });
    }
  }

  await new Promise(resolve => setTimeout(resolve, 500));
  queueMap.value.delete(identifier);
}

// Rename to; to represent the number of files at the moment of upload; to calculate the progress
const totalFilesToUpload = ref<number>(0);

async function onFileChange(files: FileList | File[]) {
  totalFilesToUpload.value = Array.from(files).length;

  for (let i = 0; i < totalFilesToUpload.value; i++) {
    const identifier = nanoid(8);
    queueMap.value.set(identifier, {
      file: files[i],
      progress: 0,
      status: 'queued'
    });
  }


  while (queueMap.value.size > 0) {

    if (Array.from(queueMap.value.values()).filter(item => item.status === 'uploading').length >= PARALLEL_UPLOADS) {
      await new Promise(resolve => setTimeout(resolve, 500));
      continue;
    }

    const responses = await Promise.allSettled(
        Array.from(queueMap.value.keys())
            .slice(0, PARALLEL_UPLOADS)
            .map(identifier => upload(queueMap.value.get(identifier)!.file, identifier))
    );

    for (const response of responses) {
      switch (response.status) {
        case 'fulfilled':
          break;
        case 'rejected':
          queueMap.value.set(response.reason.identifier, {
            ...queueMap.value.get(response.reason.identifier)!,
            status: 'error'
          });
          break;
      }
    }
  }

  totalFilesToUpload.value = 0;
}

function abortUpload(identifier?: string) {
  if (identifier) {
    const controller = queueMap.value.get(identifier)?.controller;
    if (controller) controller.abort();
  }

  for (const item of queueMap.value.values()) {
    if (item.controller) item.controller.abort();
  }

  queueMap.value.clear();
}

function pauseUpload(identifier: string) {
  const controller = queueMap.value.get(identifier)?.controller;
  if (controller) {
    controller.abort('paused');
  }
}

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
      <div class="mt-2 flex gap-2">
        <Button variant="secondary" @click="queueMap.clear()">
          Clear Queue
        </Button>

        <Button variant="secondary" @click="abortUpload(queueMap.keys().next().value)">
          Abort Upload
        </Button>
      </div>
    </div>
    <div class="grid md:grid-cols-2 gap-2">
      <div>
        <Progress v-model="progress" class="mb-4"/>
        <UploadDropzone @change="onFileChange"/>
      </div>
      <div>
        <div class="">
          <h2 class="text-lg font-semibold tracking-tight leading-relaxed">
            Upload Queue ({{ queueMap.size }})
          </h2>
          <ul class="mt-2 flex flex-col gap-2">
            <li v-for="[identifier, item] in queueMap" :key="identifier" class="flex justify-between items-center py-2">
              <div class="grid grid-cols-[auto,1fr] grid-rows-min gap-2 items-center">
                <div class="grid grid-cols-[auto,1fr] gap-2 items-center">
                  <IconFileUp class="size-6"/>
                  <span>{{ item.file.name }}</span>
                </div>
                <div class="flex flex-col gap-2">
                  <Progress v-model="item.progress"/>
                  <div>
                    <span class="line-clamp-1">{{ identifier }}</span>
                    <span class="px-1 py-0.5 bg-blue-300 text-blue-800 font-semibold leading-none">
                      {{ item.status }}
                    </span>
                  </div>
                  <div>
                    <Button variant="secondary" @click="pauseUpload(identifier)">
                      Pause
                    </Button>
                    <Button variant="secondary" @click="abortUpload(identifier)">
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          </ul>

          <Button variant="secondary" @click="abortUpload()">
            Abort All
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>