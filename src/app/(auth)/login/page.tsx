"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldError, Label } from "@/components/ui/label"
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

        <div className="block space-y-1.5">
          <Label htmlFor="identifier">Username atau Email</Label>
          <Input id="identifier" {...register("identifier")} />
          {errors.identifier && <FieldError>{errors.identifier.message}</FieldError>}
        </div>

        <div className="block space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" {...register("password")} />
          {errors.password && <FieldError>{errors.password.message}</FieldError>}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  )
}
