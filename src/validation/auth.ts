import { z } from "zod"

export const loginSchema = z.object({
  userName: z.string().min(1, "Required"),
  password: z.string().min(6, "Min 6 characters"),
})

export type LoginInput = z.infer<typeof loginSchema>
