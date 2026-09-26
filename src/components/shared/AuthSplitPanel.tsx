"use client"

import { Check } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"

export default function AuthSplitPanel() {
  const t = useTranslations("home")

  const features = t.raw("features.items") as { title: string; description: string }[]

  return (
    <aside className="hidden flex-col justify-between border-r bg-muted/40 p-10 lg:flex">
      <Link href="/dashboard" className="flex items-center gap-2">
        <span className="font-bold text-base text-gray-900 dark:text-white">BI Tools</span>
      </Link>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">BI Tools</h1>
          <p className="mt-2 text-lg text-muted-foreground">Business Intelligence Dashboard</p>
        </div>
        <ul className="space-y-3">
          {features.map((feature) => (
            <li key={feature.title} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3" />
              </span>
              <div>
                <p className="text-sm font-medium">{feature.title}</p>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} BI Tools. All rights reserved.
      </p>
    </aside>
  )
}
