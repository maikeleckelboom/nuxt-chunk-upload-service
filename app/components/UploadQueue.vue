<script lang="ts" setup>
import {nanoid} from "nanoid";
import useOverallProgress from "~/composables/useOverallProgress";
import type {FileRecord, QueueItem, UploadRecord, UploadResponse} from "~/types/upload";

const client = useSanctumClient()

const {
  data: uploadRecords,
  refresh: refreshUploadList
} = await useAsyncData('uploads', async () => await client<UploadRecord[]>('/uploads'))

const {
  data: fileRecords,
  refresh: refreshFileList
} = await useAsyncData('files', async () => await client<FileRecord[]>('/files'))

const PARALLEL_UPLOADS: number = 3 as const
const CHUNK_SIZE: number = (1024 * 1024) * 2

const uploadQueue = ref<QueueItem[]>([])

function removeFromQueue(item: QueueItem) {
  uploadQueue.value.filter((queueItem) => queueItem.identifier !== item.identifier)
}

async function uploadFile(item: QueueItem, startChunk: number = 0) {

  const controller = new AbortController()

  item.controller = controller
  item.status = 'pending'

  if(item?.uploadedChunks ) {
    startChunk = item.uploadedChunks
  } else if (item.progress > 0) {
    startChunk = Math.floor(((item.progress || 0) / 100) * (item.file.size / CHUNK_SIZE))
  }

  try {
    const totalChunks = Math.ceil(item.file.size / CHUNK_SIZE)
console.log('actually startChunk', startChunk)
    for (let chunkIndex = startChunk; chunkIndex < totalChunks; chunkIndex++) {
      const formData = new FormData()
      const currentChunk = item.file.slice(chunkIndex * CHUNK_SIZE, (chunkIndex + 1) * CHUNK_SIZE)

      formData.append('fileName', item.file.name)
      formData.append('identifier', item.identifier)
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
        removeFromQueue(item)
      }
    }

  } catch (error: unknown) {
    if (controller.signal.aborted) {
      if (controller.signal.reason === 'paused') {
        // paused
      }
    } else {
      item.status = 'failed'
      item.progress = 0
    }

    item.controller = undefined
  }
}

async function processQueue() {
  const isQueued = (item: QueueItem) => item.status === 'queued'
  const isPending = (item: QueueItem) => item.status === 'pending'
  const pendingUploads = uploadQueue.value.filter(isPending).length
  while (pendingUploads < PARALLEL_UPLOADS && uploadQueue.value.some(isQueued)) {
    const nextItem = uploadQueue.value.find(isQueued)
    if (nextItem) {
      uploadFile(nextItem).finally(processQueue)
    }
  }
}

watch(() => uploadQueue.value.length, (v) => {
  console.log('Queue Length:', v)
  processQueue()
})

const createQueueItem = (file: File): QueueItem => ({
  file,
  status: 'queued',
  identifier: nanoid(8),
  progress: 0
})

function addFiles(files: File[] | FileList) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i] as File
    const alreadyExists = uploadQueue.value.find(item => item.file.name === file.name)
    if (alreadyExists) continue
    uploadQueue.value.push(createQueueItem(file))
  }
}


async function resumeUpload(item: QueueItem, startChunk: number | null = null) {
  startChunk ??= Math.floor(((item.progress || 0) / 100) * (item.file.size / CHUNK_SIZE))
  item.status = 'queued'

  console.log('Resuming Upload with startChunk:', startChunk)


  await uploadFile(item)
}

async function resumeHandler(item: QueueItem, startChunk?: number) {
  const doesExist = (queItem: QueueItem) => queItem.identifier === item.identifier
  const existsInQueue = uploadQueue.value.some(doesExist)
  if (!existsInQueue) {
    uploadQueue.value.splice(0, 0, item)
    await nextTick()
  }

  processQueue().then(() => {

  })
}

function abortHandler(item: QueueItem) {
  if (item.controller) {
    item.controller.abort()
    item.status = 'failed'
  }
}

function pauseHandler(item: QueueItem) {
  if (item.controller) {
    item.controller.abort('paused')
    item.status = 'paused'
  }
}

async function retryHandler(item: QueueItem) {
  item.status = 'queued'
  await uploadFile(item)
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
    <template v-if="uploadQueue.length > 1">
      <div class="flex items-center gap-2">
        <span class="tabular-nums font-semibold">{{ overallProgress }}%</span>
        <Progress v-model="overallProgress"/>
      </div>
    </template>
    <div>
      <h1 class="text-2xl font-semibold tracking-tight leading-relaxed">
        Upload Manager
      </h1>
      <div class="grid grid-cols-3 gap-4">
        <div class="flex flex-col gap-2">
          <div class="flex flex-col gap-2">
            <h2 class="text-lg font-semibold">
              Failed Uploads List
            </h2>
            <Button size="sm" variant="secondary" @click="refreshUploadList">
              Refresh
            </Button>
          </div>
          <UploadList :items="uploadRecords" @resume="resumeHandler"/>
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex flex-col gap-2">
            <h2 class="text-lg font-semibold">
              Upload Queue
            </h2>
          </div>
          <QueueList
              :items="uploadQueue"
              @abort="abortHandler"
              @pause="pauseHandler"
              @resume="resumeHandler"
              @retry="retryHandler"
          />
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex flex-col gap-2">
            <h2 class="text-lg font-semibold">
              Uploaded Files List
            </h2>
            <Button size="sm" variant="secondary" @click="refreshFileList">
              Refresh
            </Button>
          </div>
          <FileList :items="fileRecords"/>
        </div>
      </div>
    </div>
  </div>
</template>