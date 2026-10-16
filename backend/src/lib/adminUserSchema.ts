import { z } from 'zod'

export const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  maxProjects: z.number().int().min(1).max(20).optional(),
})
