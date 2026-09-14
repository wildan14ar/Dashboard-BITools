"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { useLogin } from "@/hooks/use-auth"
import { type LoginInput, loginSchema } from "@/validations/auth"

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const login = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data: LoginInput) {
    setError("")
    login.mutate(
      { identifier: data.identifier, password: data.password },
      {
        onSuccess: () => router.push("/"),
        onError: (err) => setError(err instanceof Error ? err.message : "Invalid credentials"),
      },
    )
  }

  const pending = isSubmitting || login.isPending

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold tracking-tight">BI Dashboard</h1>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Username atau Email</span>
          <input
            {...register("identifier")}
            className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
          />
          {errors.identifier && (
            <p className="text-xs text-destructive">{errors.identifier.message}</p>
          )}
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            {...register("password")}
            className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
          />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  )
}
