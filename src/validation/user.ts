import { z } from "zod"

export const createUserSchema = z.object({
  userName: z.string().min(1),
  fullName: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(6),
  isSuperAdmin: z.boolean().optional(),
})

export const updateUserSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  isSuperAdmin: z.boolean().optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
