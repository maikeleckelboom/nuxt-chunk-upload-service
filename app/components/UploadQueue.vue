<script setup lang="ts">
import {nanoid} from "nanoid";
import useOverallProgress from "~/composables/useOverallProgress";

const PARALLEL_UPLOADS: number = 3 as const;

export interface UploadQueueItem {
  file: File;
  status: 'queued' | 'paused' | 'pending' | 'failed' | 'completed';
  progress: number;
  identifier: string;
  controller?: AbortController;
}


const uploadQueue = ref<UploadQueueItem[]>([]);

const client = useSanctumClient();

async function uploadFile(item: UploadQueueItem) {
  const controller = new AbortController();
  item.controller = controller;
  item.status = 'pending';

  try {
    const chunkSize = (1024 * 1024) * 2;
    const totalChunks = Math.ceil(item.file.size / chunkSize)

    for (let i = 0; i < totalChunks; i++) {

      const formData = new FormData();
      const chunkNumber = i + 1;
      const currentChunk = item.file.slice(i * chunkSize, chunkNumber * chunkSize);

      formData.append('fileName', item.file.name);
      formData.append('identifier', item.identifier);
      formData.append('chunkNumber', chunkNumber.toString());
      formData.append('totalChunks', totalChunks.toString());
      formData.append('currentChunk', currentChunk);

      const response = await client('/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      item.progress = response.progress;
      item.status = response.status;

      if (response.status === 'completed') {
        item.progress = 100;
        item.status = 'completed';
        item.controller = undefined;
      }
    }
  } catch (error) {
    item.status = 'failed';
  }
}

// Function to process the upload queue
async function processQueue() {
  const pendingUploads = uploadQueue.value.filter(item => item.status === 'pending').length;

  while (pendingUploads < PARALLEL_UPLOADS && uploadQueue.value.some(item => item.status === 'queued')) {
    const nextItem = uploadQueue.value.find(item => item.status === 'queued');
    if (nextItem) {
      nextItem.status = 'pending';
      uploadFile(nextItem).finally(processQueue);
    }
  }
}

// Watch for changes in the upload queue and process
watch(() => uploadQueue.value.length, (curr, prev) => {
  console.log('Queue changed');
  processQueue();
});

// Function to add files to the upload queue
function addFiles(files: File[] | FileList) {
  for (let i = 0; i < files.length; i++) {
    uploadQueue.value.push({
      file: files[i],
      status: 'queued',
      progress: 0,
      identifier: nanoid(8)
    })
  }
}

// Function to abort an upload
function abortUpload(item: UploadQueueItem) {
  if (item.controller) {
    item.controller.abort();
    item.status = 'failed';
  }
}

function pauseUpload(item: UploadQueueItem) {
  if (item.controller) {
    item.controller.abort('paused');
    item.status = 'paused';
  }
}

async function onFileChange(files: File[] | FileList) {
  addFiles(files);
}

async function retryUpload(item: UploadQueueItem) {
  item.status = 'queued';
  item.progress = 0;
  await uploadFile(item);
}

async function resumeUpload(item: UploadQueueItem) {
  item.status = 'queued';
  await uploadFile(item);
}

const overallProgress = useOverallProgress(uploadQueue);

</script>

<template>
  <div class="container">
    <div>
      <UploadDropzone @change="onFileChange"/>
    </div>
    <div>
      <div v-if="uploadQueue.length === 0">
        <p>No files in queue</p>
      </div>
      <div v-else>
        <div>
          <p>Overall Progress: {{ overallProgress }}%</p>
          <Progress v-model="overallProgress"/>
        </div>
        <ul>
          <li v-for="item in uploadQueue" :key="item.identifier">
            <UploadQueueItem
                :item="item"
                @abort="abortUpload"
                @pause="pauseUpload"
                @resume="resumeUpload"
                @retry="retryUpload"
            />
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>