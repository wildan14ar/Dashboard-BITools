"use client"

import type { ReactNode } from "react"
import { useAuth } from "@/hooks/use-auth"

export interface ProtectedProps {
  children: ReactNode
  fallback?: ReactNode
  loading?: ReactNode
  permissions?: string[]
}

/**
 * Component wrapper untuk conditional rendering berdasarkan permission
 * Note: Super admin otomatis punya akses ke semua permission
 *
 * @example
 * <Protected permissions={["dashboards:create"]}>
 *   <DashboardEditor />
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
