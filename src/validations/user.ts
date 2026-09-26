import { z } from "zod"

export const UserFilterSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  // Sort disanitasi via parseSort() (fallback ke default, tanpa 400).
  sort: z.string().optional(),
  order: z.string().optional(),
  isAdmin: z.coerce.boolean().optional(),
  // Postman: field selection — ?fields=fullname,avatar
  fields: z.string().optional(),
})

export const RoleSchema = z.object({
  name: z.string().min(2, "Nama role minimal 2 karakter"),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
})

export type RoleInput = z.infer<typeof RoleSchema>
