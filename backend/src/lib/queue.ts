import { Queue, Worker, Job } from 'bullmq'
import IORedis from 'ioredis'

const redisUrl = process.env.REDIS_URL || ''

if (!redisUrl) {
  console.error('REDIS_URL no configurada')
}

// Parsear URL de Upstash para IORedis
function createRedisConnection() {
  if (!redisUrl) {
    return new IORedis({ host: 'localhost', port: 6379, maxRetriesPerRequest: null })
  }
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
  })
}

export const connection = createRedisConnection()

connection.on('connect', () => console.log('Redis conectado a Upstash'))
connection.on('error', (err) => console.error('Redis error:', err.message))

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
