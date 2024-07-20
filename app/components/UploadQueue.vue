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
const CHUNK_SIZE: number = (1024 * 1024) * 2 as const

const uploadQueue = ref<UploadQueueItem[]>([])

const client = useSanctumClient()

async function uploadFile(item: UploadQueueItem, startChunk: number = 0) {
  const controller = new AbortController()
  item.controller = controller
  item.status = 'pending'

  try {
    const totalChunks = Math.ceil(item.file.size / CHUNK_SIZE)

    for (let chunkIndex = startChunk; chunkIndex < totalChunks; chunkIndex++) {

      const formData = new FormData()
      const chunkNumber = chunkIndex + 1;

      const currentChunk = item.file.slice(chunkIndex * CHUNK_SIZE, (chunkIndex + 1) * CHUNK_SIZE)

      formData.append('fileName', item.file.name)
      formData.append('identifier', item.identifier)
      formData.append('chunkNumber', chunkNumber.toString())
      formData.append('chunkIndex', chunkIndex.toString())
      formData.append('totalChunks', totalChunks.toString())
      formData.append('currentChunk', currentChunk)

      const response = await client<UploadResponse>('/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal
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

    // alt way of checking for pause
    if (controller.signal.reason === 'paused') {
      // Pause hook ...
      console.log('paused')
      return
    }

    if (controller.signal.aborted) {
      // Abort hook ...
      console.log('aborted')
    }


    item.controller = undefined
    item.status = 'failed'
    item.progress = 0

  }
}

async function processQueue() {
  const isQueued = (item) => item.status === 'queued'
  const pendingUploads = uploadQueue.value.filter(item => item.status === 'pending').length
  while (pendingUploads < PARALLEL_UPLOADS && uploadQueue.value.some(isQueued)) {
    const nextItem = uploadQueue.value.find(isQueued)
    if (nextItem) {
      nextItem.status = 'pending'
      uploadFile(nextItem).finally(processQueue)
    }
  }
}

watch(() => uploadQueue.value.length, () => {
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
  const chunkSize = (1024 * 1024) * 2
  const startChunk = Math.floor((item.progress / 100) * (item.file.size / chunkSize))
  item.status = 'queued'
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