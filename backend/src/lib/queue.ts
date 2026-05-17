import { Queue, Worker, Job } from 'bullmq'
import IORedis from 'ioredis'

const redisUrl = process.env.REDIS_URL || ''

export const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  tls: redisUrl.startsWith('rediss://') ? {} : undefined,
})

export const reportQueue = new Queue('report-generation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 15000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  }
})

export type ReportJobData = {
  projectId: string
  userId: string
  trigger: 'scheduled' | 'manual'
}
