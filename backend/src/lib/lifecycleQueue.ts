import { Queue } from 'bullmq'
import { connection } from './queue'
import { type LifecycleReason, shouldEnqueueTrialSync } from './mailchimpActions'

export type { LifecycleReason }

export type LifecycleJobData = {
  kind: 'mailchimp:sync'
  userId: string
  reason: LifecycleReason
}

export const lifecycleQueue = new Queue<LifecycleJobData>('lifecycle-sync', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 30000 },
    removeOnComplete: 200,
    removeOnFail: 100,
  },
})

// Fire-and-forget: nunca lanza al caller (no debe romper registro/webhook).
export async function enqueueMailchimpSync(userId: string, reason: LifecycleReason): Promise<void> {
  try {
    await lifecycleQueue.add(`mailchimp:${reason}`, { kind: 'mailchimp:sync', userId, reason })
  } catch (e: any) {
    console.error(`[lifecycle] no se pudo encolar mailchimp:sync (${reason}) para ${userId}:`, e?.message || e)
  }
}

// Encola el tag `estado-trial` la primera vez que un usuario STANDARD ya
// sincronizado (`registered`) hace una petición autenticada tras confirmar.
export function maybeEnqueueTrialSync(u: {
  id: string
  accountType: string
  mailchimpSyncedAt: Date | null
  mailchimpTrialTaggedAt: Date | null
}): void {
  if (shouldEnqueueTrialSync(u)) {
    void enqueueMailchimpSync(u.id, 'trial')
  }
}
