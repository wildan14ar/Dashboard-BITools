import { z } from "zod"
import { NullableAttachmentUrlSchema, OptionalAttachmentUrlSchema } from "./attachment"

export const GenderSchema = z.enum(["MALE", "FEMALE"])

export type Gender = z.infer<typeof GenderSchema>

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
  avatar: OptionalAttachmentUrlSchema,
  phone: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
  birthDate: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v),
    z.coerce.date().optional(),
  ),
  birthPlace: z.string().max(100).optional(),
  gender: GenderSchema.optional(),
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
  avatar: NullableAttachmentUrlSchema,
  phone: z.string().max(30).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  birthDate: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v),
    z.coerce.date().optional().nullable(),
  ),
  birthPlace: z.string().max(100).optional().nullable(),
  gender: GenderSchema.optional().nullable(),
  isActive: z.coerce.boolean().optional(),
  isSuperAdmin: z.coerce.boolean().optional(),
  isPublic: z.coerce.boolean().optional(),
  roleIds: z.array(z.string()).optional(),
})

// PATCH parsial: semua field opsional (password diatur via reset-password).
export const PartialUpdateUserSchema = UpdateUserSchema.partial()

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type UserInput = z.infer<typeof UserSchema>
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
