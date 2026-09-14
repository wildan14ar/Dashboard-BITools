import { z } from "zod"

export const loginSchema = z.object({
  identifier: z.string().min(3, "Username atau email minimal 3 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter"),
})

export const registerSchema = z.object({
  fullname: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
  username: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter"),
})

export const UserSchema = z.object({
  fullname: z.string().min(2, "Nama minimal 2 karakter"),
  username: z.string().min(3, "Username minimal 3 karakter"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  quote: z.string().optional(),
  avatar: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  isSuperAdmin: z.coerce.boolean().optional(),
  isPublic: z.coerce.boolean().optional(),
  roleIds: z.array(z.string()).optional(),
})

export const UpdateUserSchema = z.object({
  fullname: z.string().min(2, "Nama minimal 2 karakter"),
  username: z.string().min(3, "Username minimal 3 karakter"),
  email: z.string().email("Email tidak valid"),
  quote: z.string().optional(),
  avatar: z.string().optional(),
  password: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().min(6, "Password minimal 6 karakter").optional(),
  ),
  isActive: z.coerce.boolean().optional(),
  isSuperAdmin: z.coerce.boolean().optional(),
  isPublic: z.coerce.boolean().optional(),
  roleIds: z.array(z.string()).optional(),
})

export const UserFilterSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(["createdAt", "fullname", "username", "email"]).optional().default("createdAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  isAdmin: z.coerce.boolean().optional(),
})

export const RoleSchema = z.object({
  name: z.string().min(2, "Nama role minimal 2 karakter"),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type UserInput = z.infer<typeof UserSchema>
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
export type UserFilterInput = z.infer<typeof UserFilterSchema>
export type RoleInput = z.infer<typeof RoleSchema>
