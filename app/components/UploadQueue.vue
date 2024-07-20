<script lang="ts" setup>
import { nanoid } from 'nanoid'
import useOverallProgress from '~/composables/useOverallProgress'
import type { FileRecord, QueueItem, UploadRecord, UploadResponse } from '~/types/upload'

const client = useSanctumClient()

const { data: uploadsData, refresh: refreshUploads } = await useAsyncData(
  'uploads',
  async () => await client<UploadRecord[]>('/uploads')
)

const { data: filesData, refresh: refreshFiles } = await useAsyncData(
  'files',
  async () => await client<FileRecord[]>('/files')
)

const files = ref<FileRecord[]>(filesData.value || [])
const uploads = ref<UploadRecord[]>(uploadsData.value || [])

watch(uploadsData, (data) => {
  uploads.value = data || []
})

watch(filesData, (data) => {
  files.value = data || []
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

function processCompletedUpload(item: QueueItem, fileRecord: FileRecord) {
  // removeFromQueue(item)
  const exists = (file: FileRecord) => file.id === fileRecord.id
  if (!files.value.some(exists)) {
    files.value.unshift(fileRecord)
  }
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

      if (response.status === 'completed') {
        processCompletedUpload(item, response.file)
        processQueue()
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

function processQueue() {
  const isQueued = (item: QueueItem) => item.status === 'queued'
  const isPending = (item: QueueItem) => item.status === 'pending'
  const pendingCount = uploadQueue.value.filter(isPending).length
  while (pendingCount < PARALLEL_UPLOADS && uploadQueue.value.some(isQueued)) {
    const nextItem = uploadQueue.value.find(isQueued)
    if (nextItem) {
      uploadFile(nextItem).finally(processQueue)
    }
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
  processQueue()
}

function abortHandler(item: QueueItem) {
  if (item.controller) {
    item.controller.abort()
  }
}

function pauseHandler(item: QueueItem) {
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

const overallProgress = useOverallProgress(uploadQueue)
</script>

<template>
  <div class="container my-4 flex flex-col gap-4">
    <div>
      <UploadDropzone @change="onFileChange" />
    </div>
    <template v-if="uploadQueue.length > 1">
      <div class="flex items-center gap-2">
        <span class="font-semibold tabular-nums">{{ overallProgress }}%</span>
        <Progress v-model="overallProgress" />
      </div>
    </template>
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
