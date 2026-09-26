"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { useForm } from "react-hook-form"
import AuthSplitPanel from "@/components/shared/AuthSplitPanel"
import OAuthButtons from "@/components/shared/OAuthButtons"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLogin } from "@/hooks/use-auth"
import { type LoginInput, loginSchema } from "@/validations"

export default function LoginPage() {
  const router = useRouter()
  const loginMutation = useLogin()
  const t = useTranslations("auth")
  const [showPassword, setShowPassword] = useState(false)

  const isGoogleEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true"
  const isGithubEnabled = process.env.NEXT_PUBLIC_ENABLE_GITHUB_AUTH === "true"
  const allowRegister = process.env.NEXT_PUBLIC_ALLOW_REGISTER !== "false"

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = (data: LoginInput) => {
    loginMutation.mutate(data, {
      onSuccess: () => {
        router.push("/dashboard")
        router.refresh()
      },
    })
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthSplitPanel />
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center lg:hidden">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="font-bold text-base text-gray-900 dark:text-white">BI Tools</span>
            </Link>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{t("login.title")}</CardTitle>
              <CardDescription>{t("login.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OAuthButtons googleEnabled={isGoogleEnabled} githubEnabled={isGithubEnabled} />

              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                {loginMutation.error && (
                  <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {loginMutation.error instanceof Error
                      ? loginMutation.error.message
                      : t("login.error")}
                  </p>
                )}

                <div className="space-y-2">
                  <Label htmlFor="identifier">{t("login.identifier")}</Label>
                  <Input
                    id="identifier"
                    type="text"
                    autoComplete="username"
                    placeholder={t("login.identifierPlaceholder")}
                    {...register("identifier")}
                  />
                  {errors.identifier && (
                    <p className="text-xs text-destructive">{errors.identifier.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t("login.password")}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder={t("login.passwordPlaceholder")}
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
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <Button disabled={loginMutation.isPending} type="submit" className="w-full">
                  {loginMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("login.submit")
                  )}
                </Button>
              </form>

              {allowRegister && (
                <p className="text-center text-sm text-muted-foreground">
                  {t("login.noAccount")}{" "}
                  <Link href="/register" className="font-medium text-foreground hover:underline">
                    {t("login.registerLink")}
                  </Link>
                </p>
              )}
            </CardContent>
          </Card>

          <p className="text-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("backToHome")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
