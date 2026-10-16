import { describe, it, expect } from 'vitest'
import { updateUserSchema } from './adminUserSchema'

describe('updateUserSchema', () => {
  it('acepta los campos de siempre y maxProjects entero entre 1 y 20', () => {
    expect(updateUserSchema.safeParse({ fullName: 'Ana', phone: null }).success).toBe(true)
    expect(updateUserSchema.safeParse({ maxProjects: 1 }).success).toBe(true)
    expect(updateUserSchema.safeParse({ maxProjects: 20 }).success).toBe(true)
  })
  it('rechaza 0, 21, decimales y texto', () => {
    for (const bad of [0, 21, 2.5, -1, '5', null]) {
      expect(updateUserSchema.safeParse({ maxProjects: bad }).success, String(bad)).toBe(false)
    }
  })
  it('un cuerpo vacío es válido (no cambia nada)', () => {
    expect(updateUserSchema.safeParse({}).success).toBe(true)
  })
})
