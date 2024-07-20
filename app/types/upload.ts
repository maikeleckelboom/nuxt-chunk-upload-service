export interface UploadRecord {
    id: number;
    user_id: number;
    file_name: string;
    file_path: string;
    identifier: string;
    total_chunks: number;
    uploaded_chunks: number;
    status: 'pending' | 'completed' | 'paused' | 'failed';
    deleted_at?: Date;
    created_at: Date;
    updated_at: Date;
}

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


export interface BaseUploadResponse  {
    status: 'queued' | 'paused' | 'pending',
    progress: number,
    identifier: string
}

export interface CompletedUploadResponse  {
    status: 'completed',
    progress: number,
    file: FileRecord
}

export type UploadResponse = BaseUploadResponse | CompletedUploadResponse;

export type FailedUploadResponse = Omit<BaseUploadResponse, 'status'> & {
    status: 'failed',
    reason: string
};

export interface QueueItem {
    file: File;
    status: 'queued' | 'paused' | 'pending' | 'failed' | 'completed';
    progress: number;
    identifier: string;
    controller?: AbortController;
    uploadedChunks?: number;
}

export function isQueueItem(item: any): item is QueueItem {
    return item && item.file && item.status && item.progress && item.identifier;
}

export function isUploadRecord(item: any): item is UploadRecord {
    return item && item.id && item.user_id && item.file_name && item.file_path && item.identifier;
}