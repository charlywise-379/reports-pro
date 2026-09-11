import { Worker, Job } from 'bullmq'
import { connection } from '../lib/queue'
import { LifecycleJobData } from '../lib/lifecycleQueue'
import { prisma } from '../lib/prisma'
import { upsertMember, addTags } from '../lib/mailchimp'
import { splitName, tagsForReason } from '../lib/mailchimpActions'

export function startLifecycleWorker() {
  const worker = new Worker<LifecycleJobData>(
    'lifecycle-sync',
    async (job: Job<LifecycleJobData>) => {
      const { userId, reason } = job.data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      })
      if (!user) {
        console.log(`[lifecycle] usuario ${userId} no existe — job ${reason} descartado`)
        return
      }
      if ((user as any).accountType === 'PARTNER') {
        console.log(`[lifecycle] usuario ${userId} es PARTNER — se omite Mailchimp`)
        return
      }

      const { firstName, lastName } = splitName(user.fullName)
      const frequency = (user as any).subscriptions?.[0]?.frequency ?? null

      if (reason === 'registered' || reason === 'paid') {
        await upsertMember({ email: user.email, firstName, lastName, company: user.company })
      }

      await addTags(user.email, tagsForReason(reason, { frequency }))

      if (reason === 'registered') {
        await prisma.user.update({ where: { id: userId }, data: { mailchimpSyncedAt: new Date() } })
      } else if (reason === 'trial') {
        await prisma.user.update({ where: { id: userId }, data: { mailchimpTrialTaggedAt: new Date() } })
      }
    },
    { connection, concurrency: 3 },
  )

  worker.on('failed', (job, err) =>
    console.error(`[lifecycle] job ${job?.id} (${job?.data?.reason}) fallido:`, err.message))
  worker.on('completed', (job) =>
    console.log(`[lifecycle] job ${job.id} (${job.data.reason}) ok`))

  console.log('Worker de lifecycle iniciado')
  return worker
}
