"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { authClient } from "@/lib/auth-client"
import type { Gender, LoginInput, RegisterInput } from "@/validations"

export interface UserData {
  username: string
  email: string
  fullname: string | null
  quote?: string | null
  avatar?: string | null
  phone?: string | null
  address?: string | null
  birthDate?: string | null
  birthPlace?: string | null
  gender?: Gender | null
}

export interface UpdateProfileInput {
  fullname?: string
  username?: string
  quote?: string | null
  avatar?: string | null
  phone?: string | null
  address?: string | null
  birthDate?: string | null
  birthPlace?: string | null
  gender?: Gender | null
}

interface AuthMeResponse {
  user: UserData
}

export interface UseAuthReturn {
  // Session
  session: {
    user: { id: string; name?: string | null; email?: string | null; image?: string | null }
  } | null
  status: "loading" | "authenticated" | "unauthenticated"
  isLoading: boolean

  // User Data
  user: UserData | null
  isFetching: boolean

  // Permissions
  roles: string[]
  permissions: string[]
  isSuperAdmin: boolean
  can: (permissions: string[]) => boolean
}

/**
 * Single hook untuk semua kebutuhan auth
 *
 * @example
 * // Basic
 * const { user, isLoading } = useAuth();
 *
 * @example
 * // Permission check
 * const { can } = useAuth();
 * if (can(["blogs:create"])) { ... }
 */
export function useAuth(): UseAuthReturn {
  const { data, isPending } = authClient.useSession()
  const status: UseAuthReturn["status"] = isPending
    ? "loading"
    : data
      ? "authenticated"
      : "unauthenticated"
  const isAuthenticated = status === "authenticated"

  // Fetch user data + permissions dari API
  const {
    data: me,
    isFetching,
    isLoading: isQueryLoading,
  } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await api.get<AuthMeResponse>("/auth/me")
      return res.data
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Extract session data — roles/permissions/isSuperAdmin datang dari
  // payload session (customSession plugin), BUKAN dari /auth/me.
  const sessionExtras = (data ?? {}) as {
    roles?: string[]
    permissions?: string[]
    isSuperAdmin?: boolean
  }
  const isSuperAdmin = sessionExtras.isSuperAdmin ?? false
  const permissions = sessionExtras.permissions ?? []
  const roles = sessionExtras.roles ?? []

  // Permission checker - Super admin auto pass
  const can = (checkPermissions: string[]): boolean => {
    if (!isAuthenticated) return false
    if (isSuperAdmin) return true
    return checkPermissions.some((p) => permissions.includes(p))
  }

  return {
    // Session
    session: data ? { user: data.user } : null,
    status,
    isLoading: isPending || (isAuthenticated && isQueryLoading),

    // User Data
    user: me?.user ?? null,
    isFetching,

    // Permissions
    roles,
    permissions,
    isSuperAdmin,
    can,
  }
}

// Login mutation (identifier bisa email atau username)
export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: LoginInput) => {
      const isEmail = data.identifier.includes("@")
      const result = isEmail
        ? await authClient.signIn.email({
            email: data.identifier,
            password: data.password,
            callbackURL: "/",
          })
        : await authClient.signIn.username({
            username: data.identifier,
            password: data.password,
            callbackURL: "/",
          })
      if (result.error) throw new Error(result.error.message || "Login gagal")
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] })
    },
  })
}

// Register mutation
export function useRegister() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: RegisterInput) => {
      const result = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.fullname,
        username: data.username,
        callbackURL: "/",
      })
      if (result.error) throw new Error(result.error.message || "Registrasi gagal")
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] })
    },
  })
}

// Update profile mutation
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateProfileInput) => {
      const res = await api.put("/auth/me", data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] })
    },
  })
}

// Reset password sendiri (wajib password lama)
export function useResetPassword() {
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await api.post("/auth/reset-password", data)
      return res.data
    },
  })
}
