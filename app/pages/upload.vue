<script setup lang="ts">
import type {FetchError} from "ofetch";
import {nanoid} from "nanoid";
import {sleep} from "@antfu/utils";

const PARALLEL_UPLOADS: number = 2 as const;

interface QueueItem {
  file: File;
  status: 'paused' | 'queued' | 'uploading' | 'completed' | 'failed';
  progress: number;
  controller?: AbortController;
}

const queueMap = ref<Map<string, QueueItem>>(new Map());
const totalFilesToUpload = shallowRef<number>(0);

const progress = computed<number>(() => {
  if (queueMap.value.size === 0 || totalFilesToUpload.value === 0) {
    return 0;
  }

  const totalProgress = Array.from(queueMap.value.values())
      .reduce((acc, item) => acc + item.progress, 0);
  const maxTotalProgress = totalFilesToUpload.value * 100;

  return Math.floor((totalProgress / maxTotalProgress) * 100);
});

const client = useSanctumClient();

async function upload(file: File, identifier: string) {
  const controller = new AbortController();

  queueMap.value.set(identifier, {
    file,
    controller,
    status: 'uploading',
    progress: 0
  });

  await sleep(200);

  const chunkSize = (1024 * 1024) * 2;
  const totalChunks = Math.ceil(file.size / chunkSize)

  for (let i = 0; i < totalChunks; i++) {
    const formData = new FormData();
    const chunkNumber = i + 1;
    const currentChunk = file.slice(i * chunkSize, chunkNumber * chunkSize);

    formData.append('identifier', identifier);
    formData.append('fileName', file.name);
    formData.append('chunkNumber', chunkNumber.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('currentChunk', currentChunk);

    try {
      const {progress, status,} = await client('/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      queueMap.value.set(identifier, {
        file, controller, status,
        progress: status === 'uploading' ? progress : 100
      });

    } catch (err: FetchError) {
      const isPaused = controller.signal.reason === 'paused';

      queueMap.value.set(identifier, {
        file,
        controller,
        status: isPaused ? 'paused' : 'failed',
        progress: queueMap.value.get(identifier).progress
      });
    }

    if (controller.signal.aborted) {
      break;
    }

    if (queueMap.value.get(identifier).status === 'completed') {
      await sleep(200);
      queueMap.value.delete(identifier);
    }
  }
}


async function onFileChange(files: FileList | File[]) {

  if (totalFilesToUpload.value > 0) {
    return;
  }

  totalFilesToUpload.value = Array.from(files).length;

  for (let i = 0; i < totalFilesToUpload.value; i++) {
    const identifier = nanoid(8);
    queueMap.value.set(identifier, {
      file: files[i],
      progress: 0,
      status: 'queued',
    });
  }


  while (queueMap.value.size > 0) {
    // Upload in batches of PARALLEL_UPLOADS
    const batch = Array.from(queueMap.value.entries())
        .filter(([_, item]) => item.status === 'queued')
        .slice(0, PARALLEL_UPLOADS);

    await Promise.all(batch.map(([identifier, item]) => upload(item.file, identifier)))

    for (const [identifier, item] of batch) {
      if (item.status === 'uploading') {
        queueMap.value.set(identifier, {
          ...item,
          status: 'completed',
          progress: 100
        });
      }
    }
  }
}

function abortUpload(identifier?: string) {
  if (identifier) {
    const controller = queueMap.value.get(identifier)?.controller;
    if (controller) {
      controller.abort();
    }
    queueMap.value.delete(identifier);
  } else {
    for (const item of queueMap.value.values()) {
      if (item.controller) {
        item.controller.abort();
      }
    }
    queueMap.value.clear();
  }
}

function pauseUpload(identifier: string) {
  const item = queueMap.value.get(identifier);
  queueMap.value.set(identifier, {
    ...item,
    status: 'paused'
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
    </div>
  </div>
</template>

<style scoped>

</style>