<script lang="ts" setup>
import {nanoid} from "nanoid";
import useOverallProgress from "~/composables/useOverallProgress";
import {FetchError} from "ofetch";

export interface FileRecord {
  id: number;
  user_id: number;
  name: string;
  size: number;
  mime_type: string;
  extension: string;
  path: string;
  created_at: string;
  updated_at: string;
}

type CompletedUploadResponse = {
  status: 'completed',
  progress: number,
  file: FileRecord
};

type BaseUploadResponse = {
  status: 'queued' | 'paused' | 'pending',
  progress: number,
  identifier: string
};

type UploadResponse = BaseUploadResponse | CompletedUploadResponse;

type FailedUploadResponse = Omit<BaseUploadResponse, 'status'> & {
  status: 'failed',
  reason: string
};

export interface UploadQueueItem {
  file: File;
  status: 'queued' | 'paused' | 'pending' | 'failed' | 'completed';
  progress: number;
  identifier: string;
  controller?: AbortController;
}

const PARALLEL_UPLOADS: number = 3 as const

const uploadQueue = ref<UploadQueueItem[]>([])

const client = useSanctumClient()

async function uploadFile(item: UploadQueueItem, startChunk: number = 0) {
  const controller = new AbortController()
  item.controller = controller
  item.status = 'pending'

  try {
    const chunkSize = (1024 * 1024) * 2
    const totalChunks = Math.ceil(item.file.size / chunkSize)

    for (let i = startChunk; i < totalChunks; i++) {

      const formData = new FormData()
      const chunkNumber = i + 1;
      const currentChunk = item.file.slice(i * chunkSize, chunkNumber * chunkSize)

      formData.append('fileName', item.file.name)
      formData.append('identifier', item.identifier)
      formData.append('chunkNumber', chunkNumber.toString())
      formData.append('totalChunks', totalChunks.toString())
      formData.append('currentChunk', currentChunk)

      const response = await client<UploadResponse>('/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      item.progress = response.progress
      item.status = response.status

      if (response.status === 'completed') {
        item.controller = undefined
      }
    }

  } catch (error: FetchError) {

    if (error?.message.split(' ').pop() === 'paused') {
      // Pause hook ...

      return
    }

    if (controller.signal.aborted) {
      // Abort hook ...
    }


    item.controller = undefined
    item.status = 'failed'
    item.progress = 0

  }
}

async function processQueue() {
  const pendingUploads = uploadQueue.value.filter(item => item.status === 'pending').length
  const someStillQueued = () => uploadQueue.value.some(item => item.status === 'queued')

  while (pendingUploads < PARALLEL_UPLOADS && someStillQueued()) {
    const nextItem = uploadQueue.value.find(item => item.status === 'queued')
    if (nextItem) {
      nextItem.status = 'pending'
      uploadFile(nextItem).finally(processQueue)
    }
  }
}

watch(() => uploadQueue.value.length, () => {
  console.log('Queue changed, processing queue...')
  processQueue()
})

const createQueueItem = (file: File): UploadQueueItem => ({
  file,
  status: 'queued',
  identifier: nanoid(8),
  progress: 0
})

function addFiles(files: File[] | FileList) {
  for (let i = 0; i < files.length; i++) {
    const existingItem = uploadQueue.value.find(item => item.file.name === files[i].name)
    if (existingItem) continue
    uploadQueue.value.push(createQueueItem(files[i]))
  }
}

function abortUpload(item: UploadQueueItem) {
  if (item.controller) {
    item.controller.abort()
    item.status = 'failed'
  }
}

function pauseUpload(item: UploadQueueItem) {
  if (item.controller) {
    item.controller.abort('paused')
    item.status = 'paused'
  }
}

async function retryUpload(item: UploadQueueItem) {
  item.status = 'queued'
  await uploadFile(item)
}


async function resumeUpload(item: UploadQueueItem) {
  const chunkSize = (1024 * 1024) * 2 // Size of each chunk
  const startChunk = Math.floor((item.progress / 100) * (item.file.size / chunkSize))
  item.status = 'queued'
  console.log('Resuming upload from chunk:', startChunk)
  await uploadFile(item, startChunk)
}

async function onFileChange(files: File[] | FileList) {
  addFiles(files)
}

const overallProgress = useOverallProgress(uploadQueue)

</script>

<template>
  <div class="container flex flex-col gap-4 my-4">
    <div>
      <UploadDropzone @change="onFileChange"/>
    </div>
    <div>
      <div class="grid grid-cols-2 gap-2">
        <div class="flex flex-col gap-2">
          <div>
            <p>{{ overallProgress }}%</p>
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
        <div>
          <UploadedFiles/>
        </div>
      </div>
    </div>
  </div>
</template>