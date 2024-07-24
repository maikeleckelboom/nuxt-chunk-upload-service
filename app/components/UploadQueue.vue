<script lang="ts" setup>
import { nanoid } from 'nanoid'
import type { FileItem, QueueItem, UploadItem, UploadResponse } from '~/types/upload'

const client = useSanctumClient()

const { data: uploadsData, refresh: refreshUploads } = await useAsyncData(
  'uploads',
  async () => await client<UploadItem[]>('/uploads')
)

const { data: filesData, refresh: refreshFiles } = await useAsyncData(
  'files',
  async () => await client<FileItem[]>('/files')
)

const files = ref<FileItem[]>(filesData.value || [])
const uploads = ref<UploadItem[]>(uploadsData.value || [])

watch(uploadsData, () => {
  uploads.value = uploadsData.value || []
})

watch(filesData, () => {
  files.value = filesData.value || []
})

const PARALLEL_UPLOADS: number = 3 as const
const CHUNK_SIZE: number = 1024 * 1024 * 2

const uploadQueue = ref<QueueItem[]>([])

function removeFromQueue(item: QueueItem) {
  const index = uploadQueue.value.findIndex(
    (queuedItem) => queuedItem.identifier === item.identifier
  )
  if (index !== -1) {
    uploadQueue.value.splice(index, 1)
  }
}

function processUploadDone(item: QueueItem) {
  removeFromQueue(item)
  refreshFiles()
  processQueue()
}

async function uploadFile(item: QueueItem) {
  const controller = new AbortController()

  item.controller = controller
  item.status = 'pending'

  const totalChunks = Math.ceil(item.file.size / CHUNK_SIZE)
  const startChunk = Math.floor((item.progress / 100) * totalChunks)

  try {
    for (let chunkIndex = startChunk; chunkIndex < totalChunks; chunkIndex++) {
      const formData = new FormData()
      const currentChunk = item.file.slice(
        chunkIndex * CHUNK_SIZE,
        (chunkIndex + 1) * CHUNK_SIZE
      )
      formData.append('fileName', item.file.name)
      formData.append('fileSize', item.file.size.toString())
      formData.append('identifier', item.identifier)
      formData.append('chunkIndex', chunkIndex.toString())
      formData.append('totalChunks', totalChunks.toString())
      formData.append('currentChunk', currentChunk)

      const response = await client<UploadResponse>('/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      })

      item.progress = response.progress
      item.status = response.status

      if (response.status === 'done') {
        processUploadDone(item)
      }
    }
  } catch (error: unknown) {
    const { signal } = controller

    item.controller = undefined

    if (signal.aborted && signal.reason === 'paused') {
      item.status = 'paused'
      return
    }

    if (signal.aborted) {
      item.progress = 0
    }

    item.status = 'failed'
  }
}

async function sendPauseRequest(item: QueueItem) {
  await client(`/upload/${item.identifier}/pause`, {
    method: 'POST'
  })
}

async function processQueue() {

  const pendingItems = uploadQueue.value.filter((item) => item.status === 'pending')
  const queuedItems = uploadQueue.value.filter((item) => item.status === 'queued')

  if (pendingItems.length >= PARALLEL_UPLOADS) {
    return
  }

  const itemsToProcess = PARALLEL_UPLOADS - pendingItems.length

  for (let i = 0; i < itemsToProcess; i++) {
    const item = queuedItems.shift()
    if (item) {
      await uploadFile(item)
    }
  }

  if (queuedItems.length > 0) {
    await processQueue()
  }
}

const createQueueItem = (file: File): QueueItem => ({
  file,
  status: 'queued',
  identifier: nanoid(8),
  progress: 0
})

function addFiles(files: File[] | FileList) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i] as File
    const existsInQueue = (item: QueueItem) => item.file.name === file.name
    if (!uploadQueue.value.find(existsInQueue)) {
      uploadQueue.value.push(createQueueItem(file))
    }
  }
  processQueue()
}

async function resumeHandler(item: QueueItem) {
  const existsInQueue = (queItem: QueueItem) => queItem.identifier === item.identifier
  const queuedItem = uploadQueue.value.find(existsInQueue)
  if (queuedItem?.status === 'paused') {
    queuedItem.status = 'queued'
  } else {
    uploadQueue.value.push(item)
  }
  await processQueue()
}

function abortHandler(item: QueueItem) {
  if (item.controller) {
    item.controller.abort()
  }
}

function pauseHandler(item: QueueItem) {
  sendPauseRequest(item)
  if (item.controller) {
    item.controller.abort('paused')
  }
}

function retryHandler(item: QueueItem) {
  item.status = 'queued'
  processQueue()
}

function removeHandler(item: QueueItem) {
  removeFromQueue(item)
}

async function onFileChange(files: File[] | FileList) {
  addFiles(files)
}
</script>

<template>
  <div class="container my-4 flex flex-col gap-4">
    <div>
      <UploadDropzone @change="onFileChange" />
    </div>
    <div>
      <h1 class="text-2xl font-semibold leading-relaxed tracking-tight">
        Upload Manager
      </h1>
      <div class="grid grid-cols-3 gap-4">
        <div class="flex flex-col gap-2">
          <div class="flex flex-col gap-2">
            <h2 class="text-lg font-semibold">Failed Uploads</h2>
            <Button
              size="sm"
              variant="secondary"
              @click="refreshUploads"
            >
              Refresh
            </Button>
          </div>
          <UploadList
            :items="uploads"
            @resume="resumeHandler"
          />
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex flex-col gap-2">
            <h2 class="text-lg font-semibold">Upload Queue</h2>
            <div class="flex items-center gap-2">
              <span class="font-semibold tabular-nums">{{ uploadQueue.length }}</span>
              <Button
                size="sm"
                variant="secondary"
                @click="uploadQueue.length = 0"
              >
                Clear
              </Button>
            </div>
          </div>
          <QueueList
            :items="uploadQueue"
            @abort="abortHandler"
            @remove="removeHandler"
            @pause="pauseHandler"
            @resume="resumeHandler"
            @retry="retryHandler"
          />
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex flex-col gap-2">
            <h2 class="text-lg font-semibold">Uploaded Files ({{ files?.length }})</h2>
            <Button
              size="sm"
              variant="secondary"
              @click="refreshFiles"
            >
              Refresh
            </Button>
          </div>
          <FileList :items="files" />
        </div>
      </div>
    </div>
  </div>
</template>
