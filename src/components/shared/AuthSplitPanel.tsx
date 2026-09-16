"use client"

import { Check } from "lucide-react"
import Link from "next/link"
import { IconPlatform } from "@/components/atoms/IconPlatform"

const FEATURES = [
  {
    title: "Multi-source query",
    description: "Postgres, MySQL, MSSQL, ClickHouse, BigQuery, Mongo & API dalam satu engine.",
  },
  {
    title: "Dataset SQL aman",
    description: "Sanitizer read-only + bound params {{filter}} anti SQL injection.",
  },
  {
    title: "Dashboard interaktif",
    description: "Panel drag-and-drop, filter global, cache Redis + badge live/cached.",
  },
]

export default function AuthSplitPanel() {
  return (
    <aside className="hidden flex-col justify-between border-r bg-muted/40 p-10 lg:flex">
      <Link href="/" className="flex items-center gap-2">
        <IconPlatform size="md" showName={true} />
      </Link>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">BI Dashboard</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Self-hosted Business Intelligence untuk semua sumber data Anda.
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Daftarkan koneksi database, simpan query SQL sebagai dataset, lalu visualisasikan
            sebagai panel grafik di dashboard yang bisa di-share publik maupun ke tim.
          </p>
        </div>
        <ul className="space-y-3">
          {FEATURES.map((feature) => (
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
        &copy; {new Date().getFullYear()} BI Dashboard. All rights reserved.
      </p>
    </aside>
  )
}
