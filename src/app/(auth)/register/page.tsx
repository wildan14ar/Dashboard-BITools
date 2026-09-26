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
import { useRegister } from "@/hooks/use-auth"
import { type RegisterInput, registerSchema } from "@/validations"

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const registerMutation = useRegister()
  const t = useTranslations("auth")

  const isGoogleEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true"
  const isGithubEnabled = process.env.NEXT_PUBLIC_ENABLE_GITHUB_AUTH === "true"

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = (data: RegisterInput) => {
    registerMutation.mutate(data, {
      onSuccess: () => {
        router.push("/")
      },
    })
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthSplitPanel />
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-bold text-base text-gray-900 dark:text-white">BI Tools</span>
            </Link>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{t("register.title")}</CardTitle>
              <CardDescription>{t("register.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OAuthButtons googleEnabled={isGoogleEnabled} githubEnabled={isGithubEnabled} />

              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                {registerMutation.error && (
                  <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {registerMutation.error instanceof Error
                      ? registerMutation.error.message
                      : t("register.error")}
                  </p>
                )}

                <div className="space-y-2">
                  <Label htmlFor="fullname">{t("register.fullname")}</Label>
                  <Input
                    id="fullname"
                    type="text"
                    autoComplete="name"
                    placeholder={t("register.fullnamePlaceholder")}
                    {...register("fullname")}
                  />
                  {errors.fullname && (
                    <p className="text-xs text-destructive">{errors.fullname.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">{t("register.username")}</Label>
                  <Input
                    id="username"
                    type="text"
                    autoComplete="username"
                    placeholder={t("register.usernamePlaceholder")}
                    {...register("username")}
                  />
                  {errors.username && (
                    <p className="text-xs text-destructive">{errors.username.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t("register.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder={t("register.emailPlaceholder")}
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t("register.password")}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder={t("register.passwordPlaceholder")}
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

                <Button disabled={registerMutation.isPending} type="submit" className="w-full">
                  {registerMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("register.submit")
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                {t("register.haveAccount")}{" "}
                <Link href="/login" className="font-medium text-foreground hover:underline">
                  {t("register.loginLink")}
                </Link>
              </p>
            </CardContent>
          </Card>

          <p className="text-center">
            <Link
              href="/"
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
