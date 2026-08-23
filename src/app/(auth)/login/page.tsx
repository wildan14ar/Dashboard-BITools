"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { loginSchema, type LoginInput } from "@/validation/auth"

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data: LoginInput) {
    setError("")
    const res = await signIn("credentials", { ...data, redirect: false })
    if (res?.error) setError("Invalid credentials")
    else router.push("/")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold tracking-tight">BI Dashboard</h1>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Username</span>
          <input
            {...register("userName")}
            className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
          />
          {errors.userName && (
            <p className="text-xs text-destructive">{errors.userName.message}</p>
          )}
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            {...register("password")}
            className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  )
}
