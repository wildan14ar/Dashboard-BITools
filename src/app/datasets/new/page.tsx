"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldError, Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCreateDataset } from "@/hooks/use-datasets"
import { useSources } from "@/hooks/use-sources"
import { type DatasetInput, datasetSchema } from "@/validations/dataset"

export default function NewDatasetPage() {
  const router = useRouter()
  const { data: sources = [] } = useSources()
  const createDataset = useCreateDataset()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DatasetInput>({ resolver: zodResolver(datasetSchema) })

  function onSubmit(data: DatasetInput) {
    createDataset.mutate(data, { onSuccess: () => router.push("/datasets") })
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-bold">New Dataset</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="block space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register("name")} placeholder="Monthly Sales" />
          {errors.name && <FieldError>{errors.name.message}</FieldError>}
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Source</span>
          <select {...register("sourceId")} className="input">
            <option value="">Select a source...</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {errors.sourceId && <FieldError>{errors.sourceId.message}</FieldError>}
        </label>

        <div className="block space-y-1.5">
          <Label htmlFor="sql">SQL Query</Label>
          <Textarea
            id="sql"
            {...register("sql")}
            rows={8}
            placeholder="SELECT * FROM orders WHERE created_at > '2024-01-01'"
            className="min-h-[160px] font-mono text-xs"
          />
          {errors.sql && <FieldError>{errors.sql.message}</FieldError>}
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting || createDataset.isPending}>
            Create Dataset
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
