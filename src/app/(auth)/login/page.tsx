"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { IconPlatform } from "@/components/atoms/IconPlatform"
import AuthSplitPanel from "@/components/shared/AuthSplitPanel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FieldError, Label } from "@/components/ui/label"
import { useLogin } from "@/hooks/use-auth"
import { type LoginInput, loginSchema } from "@/validations/auth"

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthSplitPanel />
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <IconPlatform size="md" showName={true} />
            </Link>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Selamat datang kembali</CardTitle>
              <CardDescription>Masuk untuk mengelola dashboard BI Anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                {error && (
                  <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <div className="space-y-2">
                  <Label htmlFor="identifier">Username atau Email</Label>
                  <Input
                    id="identifier"
                    type="text"
                    autoComplete="username"
                    placeholder="username atau email@contoh.com"
                    {...register("identifier")}
                  />
                  {errors.identifier && <FieldError>{errors.identifier.message}</FieldError>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="pr-10"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <FieldError>{errors.password.message}</FieldError>}
                </div>

                <Button disabled={pending} type="submit" className="w-full">
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
