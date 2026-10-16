import { describe, it, expect } from 'vitest'
import { resolveCheckoutProjectId } from './checkoutProject'

const projects = [{ id: 'p1' }, { id: 'p2' }]

describe('resolveCheckoutProjectId', () => {
  it('sin projectId usa el primer proyecto (comportamiento actual)', () => {
    expect(resolveCheckoutProjectId(projects, undefined)).toEqual({ ok: true, projectId: 'p1' })
    expect(resolveCheckoutProjectId(projects, null)).toEqual({ ok: true, projectId: 'p1' })
    expect(resolveCheckoutProjectId(projects, '')).toEqual({ ok: true, projectId: 'p1' })
  })
  it('con projectId propio lo usa', () => {
    expect(resolveCheckoutProjectId(projects, 'p2')).toEqual({ ok: true, projectId: 'p2' })
  })
  it('projectId ajeno: 403', () => {
    expect(resolveCheckoutProjectId(projects, 'otro')).toEqual({ ok: false, status: 403, error: 'El proyecto no te pertenece' })
  })
  it('projectId que no es texto: 400', () => {
    expect(resolveCheckoutProjectId(projects, 5).ok).toBe(false)
    expect(resolveCheckoutProjectId(projects, ['p1'])).toMatchObject({ ok: false, status: 400 })
  })
  it('usuario sin proyectos: 404', () => {
    expect(resolveCheckoutProjectId([], undefined)).toEqual({ ok: false, status: 404, error: 'Proyecto no encontrado' })
    expect(resolveCheckoutProjectId([], 'p1')).toMatchObject({ ok: false, status: 404 })
  })
})
