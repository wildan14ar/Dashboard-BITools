import { z } from "zod"

export const createUserSchema = z.object({
  username: z.string().min(1),
  fullname: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(6),
  isSuperAdmin: z.boolean().optional(),
})

export const updateUserSchema = z.object({
  fullname: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  isSuperAdmin: z.boolean().optional(),
})

export type CreateBiUserInput = z.infer<typeof createUserSchema>
export type UpdateBiUserInput = z.infer<typeof updateUserSchema>
