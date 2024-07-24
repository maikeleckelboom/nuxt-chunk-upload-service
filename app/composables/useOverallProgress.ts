import type {Ref} from 'vue'
import type {QueueItem} from '~/types/upload'

export default function useOverallProgress(uploadQueue: Ref<QueueItem[]>): Ref<number> {

    const uploadedCount = ref<number>(0)

    return computed<number>(() => {
        const uploadQueueLength = uploadQueue.value.length + uploadedCount.value
        const queuedFiles = uploadQueue.value.filter((item) => item.status !== 'queued').length

        const inProgressProgress = uploadQueue.value.reduce((acc, item) => {
            return acc + (item.progress || 0)
        }, 0)

        const completedFiles = queuedFiles - uploadQueueLength
        const completedProgress = completedFiles * 100
        const totalProgress = completedProgress + inProgressProgress
        const totalMaxProgress = queuedFiles * 100

        return Math.round((totalProgress / totalMaxProgress) * 100)
    })
}
