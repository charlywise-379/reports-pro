import { describe, it, expect, vi } from 'vitest'
import { enqueueFirstPaidReport, FirstPaidReportDeps } from './firstPaidReport'

const makeDeps = (over: Partial<FirstPaidReportDeps> = {}): FirstPaidReportDeps => ({
  isConfigured: vi.fn(async () => true),
  hasFullReport: vi.fn(async () => false),
  hasGeneratingReport: vi.fn(async () => false),
  hasPendingJob: vi.fn(async () => false),
  enqueue: vi.fn(async () => undefined),
  ...over,
})
const input = { projectId: 'p1', userId: 'u1', subscriptionStatus: 'active' }

describe('enqueueFirstPaidReport', () => {
  it('encola con jobId fijo cuando el pago está confirmado', async () => {
    const deps = makeDeps()
    expect(await enqueueFirstPaidReport(deps, input)).toEqual({ queued: true })
    expect(deps.enqueue).toHaveBeenCalledWith('p1', 'u1', 'first-paid-p1')
  })

  it('no encola en periodo de prueba (sin pago)', async () => {
    const deps = makeDeps()
    expect(await enqueueFirstPaidReport(deps, { ...input, subscriptionStatus: 'trialing' })).toEqual({ queued: false, reason: 'not_paid' })
    expect(deps.enqueue).not.toHaveBeenCalled()
  })

  it('no encola sin onboarding terminado', async () => {
    const deps = makeDeps({ isConfigured: vi.fn(async () => false) })
    expect((await enqueueFirstPaidReport(deps, input)).queued).toBe(false)
    expect(deps.enqueue).not.toHaveBeenCalled()
  })

  it('no encola si ya tiene un reporte completo', async () => {
    const deps = makeDeps({ hasFullReport: vi.fn(async () => true) })
    expect(await enqueueFirstPaidReport(deps, input)).toEqual({ queued: false, reason: 'already_has_full_report' })
  })

  it('no encola si ya hay uno generándose o en cola', async () => {
    for (const over of [{ hasGeneratingReport: vi.fn(async () => true) }, { hasPendingJob: vi.fn(async () => true) }]) {
      const deps = makeDeps(over)
      expect(await enqueueFirstPaidReport(deps, input)).toEqual({ queued: false, reason: 'already_generating' })
      expect(deps.enqueue).not.toHaveBeenCalled()
    }
  })
})
