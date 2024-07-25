export interface UploadItem {
  id: number
  user_id: number
  file_name: string
  path: string
  identifier: string
  total_chunks: number
  uploaded_chunks: number
  status: 'pending' | 'done' | 'paused' | 'failed'
  created_at: string
  updated_at: string
}

export interface FileItem {
  id: number
  user_id: number
  name: string
  size: number
  mime_type: string
  extension: string
  path: string
  url: string
  created_at: string
  updated_at: string
}

export interface BaseUploadResponse {
  status: 'pending' | 'paused'
  progress: number
  identifier: string
}

export interface UploadDoneResponse {
  status: 'done'
  progress: number
  file: FileItem
}

export type UploadResponse = BaseUploadResponse | UploadDoneResponse

export type FailedUploadResponse = Omit<BaseUploadResponse, 'status'> & {
  status: 'failed'
  reason: string
}

export interface QueueItem {
  file: File
  status: 'queued' | 'paused' | 'pending' | 'failed' | 'done'
  progress: number
  identifier: string
  controller?: AbortController
  uploadedChunks?: number
}

export function isQueueItem(item: any): item is QueueItem {
  return item && item.file && item.status && item.progress && item.identifier
}

export function isUploadRecord(item: any): item is UploadItem {
  return (
    item && item.id && item.user_id && item.file_name && item.file_path && item.identifier
  )
}
