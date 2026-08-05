"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { sourceSchema, type SourceInput } from "@/validation/source"

const DB_TYPES = [
  { value: "postgresql", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "sqlite", label: "SQLite" },
  { value: "clickhouse", label: "ClickHouse" },
  { value: "bigquery", label: "BigQuery" },
  { value: "mongodb", label: "MongoDB" },
]

export default function NewSourcePage() {
  const router = useRouter()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SourceInput>({
    resolver: zodResolver(sourceSchema),
    defaultValues: { type: "postgresql" },
  })

  async function onSubmit(data: SourceInput) {
    await axios.post("/api/sources", data)
    router.push("/sources")
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-bold">New Source</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Name</span>
          <input {...register("name")} placeholder="Production DB" className="input" />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Type</span>
          <select {...register("type")} className="input">
            {DB_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Config (JSON)</span>
          <textarea
            {...register("config")}
            rows={6}
            placeholder={`{"host":"localhost","port":5432,"user":"postgres","password":"...","database":"mydb"}`}
            className="input font-mono text-xs min-h-[100px] py-2"
          />
          {errors.config && <p className="text-xs text-destructive">Invalid JSON</p>}
        </label>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>Create Source</Button>
          <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
