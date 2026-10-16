import { describe, it, expect } from 'vitest'
import { projectLimitInfo, projectLimitMessage } from './projectLimits'

describe('projectLimitInfo', () => {
  it('PARTNER siempre puede crear y no tiene máximo', () => {
    expect(projectLimitInfo({ accountType: 'PARTNER', maxProjects: 1, projectCount: 40 })).toEqual({ max: null, used: 40, canCreate: true })
  })
  it('usuario normal con el valor por defecto (1) y un proyecto no puede crear', () => {
    expect(projectLimitInfo({ accountType: 'STANDARD', maxProjects: 1, projectCount: 1 })).toEqual({ max: 1, used: 1, canCreate: false })
  })
  it('borde: 4 de 5 puede, 5 de 5 no', () => {
    expect(projectLimitInfo({ accountType: 'STANDARD', maxProjects: 5, projectCount: 4 }).canCreate).toBe(true)
    expect(projectLimitInfo({ accountType: 'STANDARD', maxProjects: 5, projectCount: 5 }).canCreate).toBe(false)
    expect(projectLimitInfo({ accountType: 'STANDARD', maxProjects: 5, projectCount: 6 }).canCreate).toBe(false)
  })
  it('valores inválidos de maxProjects caen en 1', () => {
    expect(projectLimitInfo({ accountType: 'STANDARD', maxProjects: 0, projectCount: 0 }).max).toBe(1)
    expect(projectLimitInfo({ accountType: 'STANDARD', maxProjects: null, projectCount: 0 }).max).toBe(1)
    expect(projectLimitInfo({ accountType: 'STANDARD', maxProjects: undefined, projectCount: 0 }).max).toBe(1)
    expect(projectLimitInfo({ accountType: null, maxProjects: 2.9, projectCount: 0 }).max).toBe(2)
  })
  it('mensaje en singular y plural', () => {
    expect(projectLimitMessage(1)).toBe('Alcanzaste el máximo de 1 empresa')
    expect(projectLimitMessage(5)).toBe('Alcanzaste el máximo de 5 empresas')
  })
})
