import { describe, it, expect } from 'vitest'
import { buildProjectQuery, projectListFor } from './dashboardProject'

describe('buildProjectQuery', () => {
  it('sin projectId: el más reciente del usuario', () => {
    expect(buildProjectQuery('u1', undefined)).toEqual({ where: { userId: 'u1' }, orderBy: { createdAt: 'desc' } })
    expect(buildProjectQuery('u1', '   ')).toEqual({ where: { userId: 'u1' }, orderBy: { createdAt: 'desc' } })
  })
  it('con projectId: acotado siempre al dueño', () => {
    expect(buildProjectQuery('u1', ' p9 ').where).toEqual({ userId: 'u1', id: 'p9' })
  })
  it('ignora valores que no son texto (p. ej. arreglos de query string)', () => {
    expect(buildProjectQuery('u1', ['a', 'b']).where).toEqual({ userId: 'u1' })
  })
})

describe('projectListFor', () => {
  const projects = [
    { id: 'p1', name: 'A', competitiveSetup: { companyName: 'Acme' } },
    { id: 'p2', name: null, competitiveSetup: null },
  ]
  it('PARTNER recibe la lista con el nombre de la empresa', () => {
    expect(projectListFor('PARTNER', projects)).toEqual([
      { id: 'p1', name: 'A', companyName: 'Acme' },
      { id: 'p2', name: null, companyName: null },
    ])
  })
  it('STANDARD o desconocido recibe null', () => {
    expect(projectListFor('STANDARD', projects)).toBeNull()
    expect(projectListFor(undefined, projects)).toBeNull()
  })
})
