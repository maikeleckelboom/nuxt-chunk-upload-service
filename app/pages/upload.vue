<script setup lang="ts">
import {nanoid} from "nanoid";
import {sleep} from "@antfu/utils";

const PARALLEL_UPLOADS: number = 3 as const;

interface QueueItem {
  file: File;
  status: 'queued' | 'paused' | 'pending' | 'failed' | 'completed'
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
  return Math.round((totalProgress / totalMaxProgress) * 100);
});


const client = useSanctumClient();

async function upload(file: File, identifier: string) {
  const controller = new AbortController();

  const item = uploadQueue.value.get(identifier);

  if (!item || item?.status === 'paused') {
    console.log('paused');
    return Promise.resolve();
  }

  uploadQueue.value.set(identifier, {
    ...item,
    status: 'pending',
    controller
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
      const response = await client('/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      console.log(response)

      uploadQueue.value.set(identifier, {
        ...uploadQueue.value.get(identifier),
        status: response.status,
        progress: response.progress,
      })

      if (response.status === 'completed') {
        uploadQueue.value.set(identifier, {
          ...uploadQueue.value.get(identifier),
          status: response.status,
          progress: response.progress,
          controller: undefined
        });
      }

      return

    } catch (err: unknown) {

      if (controller.signal.aborted) {
        if (controller.signal.reason === 'paused') {
          uploadQueue.value.set(identifier, {
            ...uploadQueue.value.get(identifier),
            status: 'paused',
          });
        } else {
          uploadQueue.value.delete(identifier);
        }

        break;
      }

      if (import.meta.env.DEV) {
        console.error(err, 'at the end in error block of upload function');
      }
    }

    controller.signal.addEventListener('pause', () => {
      const item = uploadQueue.value.get(identifier);
      if (item.controller) {
        item.controller.abort('paused');
      }
      uploadQueue.value.set(identifier, {
        ...uploadQueue.value.get(identifier),
        status: 'paused',
      });

    });


  }

}

async function onFileChange(files: FileList | File[]) {
  const validItemsInQueue = Array.from(uploadQueue.value.values()).filter(item => ['queued'].includes(item.status));
  totalFilesToUpload.value = Number(Array.from(files).length + validItemsInQueue.length);

  for (let i = 0; i < totalFilesToUpload.value; i++) {
    const file = files[i];
    const identifier = nanoid(8);
    uploadQueue.value.set(identifier, {
      file,
      status: 'queued',
      progress: 0
    });
  }

  const entries = Array.from(uploadQueue.value.entries()).filter(([_, item]) => item.status === 'queued');

  while (entries.length > 0) {
    const pendingEntries = entries.filter(([_, item]) => item.status === 'pending');
    const queued = entries.filter(([_, item]) => item.status === 'queued');
    const batch = queued.slice(0, PARALLEL_UPLOADS - pendingEntries.length);
    const promises = batch.map(([identifier, item]) => {
      return upload(item.file, identifier)
    });
    const firstResolved = await Promise.race(promises);
    console.log('firstResolved', firstResolved);
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

function pauseUpload(identifier: string) {
  const item = uploadQueue.value.get(identifier);

  if (item.controller) {
    item.controller.signal.dispatchEvent(new Event('pause'));
  }
}

</script>

<template>
  <div class="container px-12 py-4">
    <div class="mb-4">
      <h1 class="text-2xl font-semibold tracking-tight leading-relaxed mb-3">
        Upload Files
      </h1>
      <div class="text-sm">
        <p>
          <strong>Max Parallel Uploads:</strong> {{ PARALLEL_UPLOADS }}
        </p>
        <p>
          <strong>Chunk Size:</strong> 2MB
        </p>
        <p>
          <strong>Overall Progress:</strong> {{ overallProgress }}%
        </p>
        <p>
          <strong>Total Files:</strong> {{ totalFilesToUpload }}
        </p>
        <p>
          <strong>Queue Size:</strong> {{ uploadQueue.size }}
        </p>

      </div>
      <div class="mt-2 flex gap-2">
        <Button variant="secondary" @click="uploadQueue.clear()">
          Clear Queue
        </Button>
        <Button variant="secondary" @click="abortAllInQueue()">
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
                    <Button variant="secondary" @click="abortByIdentifier(identifier)">
                      Cancel
                    </Button>
                  </template>
                </div>
              </div>
            </div>
          </li>
        </ul>

        <Button variant="secondary" @click="abortAllInQueue()">
          Abort All
        </Button>
      </div>
    </div>
    <UploadedFiles/>
  </div>
</template>

<style scoped>

</style>