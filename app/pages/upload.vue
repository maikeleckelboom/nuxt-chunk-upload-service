<script setup lang="ts">
import type {FetchError} from "ofetch";
import {nanoid} from "nanoid";
import {sleep} from "@antfu/utils";

const PARALLEL_UPLOADS: number = 3 as const;

interface QueueItem {
  file: File;
  status:  'queued' | 'uploading' | 'completed' | 'failed';
  progress: number;
  controller?: AbortController;
}

const uploadQueue = ref<Map<string, QueueItem>>(new Map());
const totalFilesToUpload = shallowRef<number>(0);

const overallProgress = computed<number>(() => {
  if (uploadQueue.value.size === 0 || totalFilesToUpload.value === 0) {
    return 0;
  }

  const inProgressProgress = Array.from(uploadQueue.value.values()).reduce((acc, item) => {
    return acc + (item.progress || 0);
  }, 0);

  const completedFiles = totalFilesToUpload.value - uploadQueue.value.size;
  const completedProgress = completedFiles * 100;
  const totalProgress = completedProgress + inProgressProgress;
  const totalMaxProgress = totalFilesToUpload.value * 100;
  return Math.floor((totalProgress / totalMaxProgress) * 100);
});


const client = useSanctumClient();

async function upload(file: File, identifier: string) {
  const controller = new AbortController();

  uploadQueue.value.set(identifier, {
    file,
    controller,
    status: 'uploading',
    progress: 0
  });

  await sleep(100);

  const chunkSize = (1024 * 1024) * 2;
  const totalChunks = Math.ceil(file.size / chunkSize)

  for (let i = 0; i < totalChunks; i++) {
    const formData = new FormData();
    const chunkNumber = i + 1;
    const currentChunk = file.slice(i * chunkSize, chunkNumber * chunkSize);

    formData.append('fileName', file.name);
    formData.append('identifier', identifier);
    formData.append('chunkNumber', chunkNumber.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('currentChunk', currentChunk);

    try {
      const {progress, status} = await client('/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      uploadQueue.value.set(identifier, {
        file,
        controller,
        status,
        progress: status === 'uploading' ? progress : 100
      });

    } catch (err: FetchError) {
      const isPaused = controller.signal.reason === 'paused';

      uploadQueue.value.set(identifier, {
        file,
        controller,
        status: isPaused ? 'queued' : 'failed',
        progress: uploadQueue.value.get(identifier).progress
      });
    }

    if (controller.signal.aborted) {
      break;
    }

    if (uploadQueue.value.get(identifier).status === 'completed') {
      await sleep(100);
      uploadQueue.value.delete(identifier);
    }
  }
}


async function onFileChange(files: FileList | File[]) {

  totalFilesToUpload.value = Number(Array.from(files).length + uploadQueue.value.size);

  for (let i = 0; i < totalFilesToUpload.value; i++) {
    uploadQueue.value.set(nanoid(8), {
      file: files[i],
      status: 'queued',
      progress: 0
    });
  }


  while (uploadQueue.value.size > 0) {
    const entries = Array.from(uploadQueue.value.entries());
    const uploadingEntries = entries.filter(([_, item]) => item.status === 'uploading');
    const allowedUNewUploadCount = PARALLEL_UPLOADS - uploadingEntries.length;
    const batch = entries.filter(([_, item]) => item.status === 'queued').slice(0, allowedUNewUploadCount);
    const promises = batch.map(([identifier, item]) => upload(item.file, identifier));
    await Promise.race(promises);
  }
}

function abortAllInQueue() {
  for (const item of uploadQueue.value.values()) {
    if (item.controller) item.controller.abort();
  }
  uploadQueue.value.clear();
}

function abortByIdentifier(identifier: string) {
  const controller = uploadQueue.value.get(identifier)?.controller;
  if (controller) controller.abort();
  uploadQueue.value.delete(identifier);
}

function abortUpload(identifier?: string) {
  identifier
      ? abortByIdentifier(identifier)
      : abortAllInQueue();
}

function pauseUpload(identifier: string) {
  const item = uploadQueue.value.get(identifier);
  uploadQueue.value.set(identifier, {
    ...item,
    status: 'queued'
  });
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
        <Button variant="secondary" @click="uploadQueue.clear()">
          Clear Queue
        </Button>
        <Button variant="secondary" @click="abortUpload()">
          Abort All
        </Button>
      </div>
    </div>
    <div class="grid md:grid-cols-2 gap-6 md:gap-12">
      <div>
        <Progress v-model="overallProgress" class="mb-4"/>
        <UploadDropzone @change="onFileChange"/>
      </div>
      <div class="flex flex-col gap-4">
        <h2 class="text-lg font-semibold tracking-tight leading-relaxed">
          Upload Queue ({{ uploadQueue.size }})
        </h2>
        <ul class="mt-2 flex flex-col gap-2">
          <li v-for="[identifier, item] in uploadQueue" :key="identifier"
              class="flex justify-between items-center py-2">
            <div class="grid grid-cols-[auto,1fr] grid-rows-min gap-2 items-center">
              <div class="grid grid-cols-[auto,1fr] gap-2 items-center">
                <IconFileUp class="size-6"/>
                <span>{{ item.file.name }}</span>
              </div>
              <div class="flex flex-col gap-2">
                <Progress v-model="item.progress"/>
                <div>
                  <span class="line-clamp-1">{{ identifier }}</span>
                  <span class="px-1 py-0.5 font-semibold leading-none">
                      {{ item.status }}
                    </span>
                </div>
                <div class="flex gap-2">
                  <template v-if="item.status !== 'completed'">
                    <Button variant="secondary" @click="pauseUpload(identifier)">
                      Pause
                    </Button>
                    <Button variant="secondary" @click="abortUpload(identifier)">
                      Cancel
                    </Button>
                  </template>
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
    <UploadedFiles/>
  </div>
</template>

<style scoped>

</style>