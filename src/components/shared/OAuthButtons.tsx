"use client"

import { useTranslations } from "next-intl"
import { ProviderIcon } from "@/components/shared/ProviderIcon"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

interface OAuthButtonsProps {
  googleEnabled: boolean
  githubEnabled: boolean
}

export default function OAuthButtons({ googleEnabled, githubEnabled }: OAuthButtonsProps) {
  const t = useTranslations("auth.login")

  if (!googleEnabled && !githubEnabled) return null

  const handleOAuthSignIn = (provider: "google" | "github") => {
    authClient.signIn.social({ provider, callbackURL: "/" })
  }

  return (
    <>
      <div className="grid gap-2">
        {googleEnabled && (
          <Button variant="outline" type="button" onClick={() => handleOAuthSignIn("google")}>
            <ProviderIcon provider="google" className="h-4 w-4" />
            {t("continueGoogle")}
          </Button>
        )}
        {githubEnabled && (
          <Button variant="outline" type="button" onClick={() => handleOAuthSignIn("github")}>
            <ProviderIcon provider="github" className="h-4 w-4" />
            {t("continueGithub")}
          </Button>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">{t("orContinue")}</span>
        </div>
      </div>
    </>
  )
}
