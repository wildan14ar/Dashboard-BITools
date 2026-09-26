"use client"

import type { ReactNode } from "react"
import { useAuth } from "@/hooks/use-auth"

export interface ProtectedProps {
  children: ReactNode
  fallback?: ReactNode
  loading?: ReactNode
  permissions?: string[] // Multiple permissions (OR logic - any one is enough)
}

/**
 * Component wrapper untuk conditional rendering berdasarkan permission
 *
 * Note: Super admin otomatis punya akses ke semua permission
 *
 * @example
 * // Basic usage
 * <Protected permissions={["blogs:create", "blogs:update"]}>
 *     <BlogEditor />
 * </Protected>
 *
 * @example
 * // Dengan fallback
 * <Protected permissions={["users:delete"]} fallback={<DisabledButton />}>
 *     <DeleteButton />
 * </Protected>
 *
 * @example
 * // Navigation (fallback = null untuk hide)
 * <Protected permissions={["users:admin"]} fallback={null}>
 *     <Link href="/users">Users</Link>
 * </Protected>
 */
export function Protected({
  children,
  fallback = null,
  loading = null,
  permissions,
}: ProtectedProps) {
  const { can, isLoading } = useAuth()

  if (isLoading) {
    return <>{loading}</>
  }

  if (!permissions || permissions.length === 0) {
    return <>{children}</>
  }

  if (!can(permissions)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
