"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { authClient } from "@/lib/auth-client"
import type { LoginInput, RegisterInput } from "@/validations"

export interface UserData {
  username: string
  email: string
  fullname: string | null
  quote?: string | null
  avatar?: string | null
}

export interface UpdateProfileInput {
  fullname?: string
  username?: string
  quote?: string | null
  avatar?: string | null
  currentPassword?: string
  newPassword?: string
}

interface AuthMeResponse {
  user: UserData
  roles: string[]
  isSuperAdmin: boolean
  permissions: string[]
}

export interface UseAuthReturn {
  session: {
    user: { id: string; name?: string | null; email?: string | null; image?: string | null }
  } | null
  status: "loading" | "authenticated" | "unauthenticated"
  isLoading: boolean
  user: UserData | null
  isFetching: boolean
  roles: string[]
  permissions: string[]
  isSuperAdmin: boolean
  can: (permissions: string[]) => boolean
}

/**
 * Single hook untuk semua kebutuhan auth — pola PortoNext.
 */
export function useAuth(): UseAuthReturn {
  const { data, isPending } = authClient.useSession()
  const status: UseAuthReturn["status"] = isPending
    ? "loading"
    : data
      ? "authenticated"
      : "unauthenticated"
  const isAuthenticated = status === "authenticated"

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
    staleTime: 5 * 60 * 1000,
  })

  const isSuperAdmin = me?.isSuperAdmin ?? false
  const permissions = me?.permissions ?? []
  const roles = me?.roles ?? []

  const can = (checkPermissions: string[]): boolean => {
    if (!isAuthenticated) return false
    if (isSuperAdmin) return true
    return checkPermissions.some((p) => permissions.includes(p))
  }

  return {
    session: data ? { user: data.user } : null,
    status,
    isLoading: isPending || (isAuthenticated && isQueryLoading),
    user: me?.user ?? null,
    isFetching,
    roles,
    permissions,
    isSuperAdmin,
    can,
  }
}

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
