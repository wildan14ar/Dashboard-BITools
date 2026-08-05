"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { datasetSchema, type DatasetInput } from "@/validation/dataset"

type Source = { id: string; name: string }

export default function NewDatasetPage() {
  const router = useRouter()
  const [sources, setSources] = useState<Source[]>([])
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<DatasetInput>({ resolver: zodResolver(datasetSchema) })

  useEffect(() => { axios.get("/api/sources").then((r) => setSources(r.data)) }, [])

  async function onSubmit(data: DatasetInput) {
    await axios.post("/api/datasets", data)
    router.push("/datasets")
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="size-4" /></Button>
        <h1 className="text-2xl font-bold">New Dataset</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Name</span>
          <input {...register("name")} placeholder="Monthly Sales" className="input" />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Description</span>
          <input {...register("description")} placeholder="Optional" className="input" />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Source</span>
          <select {...register("sourceId")} className="input">
            <option value="">Select a source...</option>
            {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {errors.sourceId && <p className="text-xs text-destructive">{errors.sourceId.message}</p>}
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">SQL Query</span>
          <textarea {...register("sql")} rows={8} placeholder="SELECT * FROM orders WHERE created_at > '2024-01-01'" className="input font-mono text-xs min-h-[160px] py-2" />
          {errors.sql && <p className="text-xs text-destructive">{errors.sql.message}</p>}
        </label>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>Create Dataset</Button>
          <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
