"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { Suspense } from "react"
import { useForm } from "react-hook-form"
import { Protected } from "@/components/Protected"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useCreateDataset } from "@/hooks/use-datasets"
import { useSources } from "@/hooks/use-sources"
import { type DatasetInput, datasetSchema } from "@/validations/dataset"

function NewDatasetContent() {
  const router = useRouter()
  const { data: sources = [] } = useSources()
  const createDataset = useCreateDataset()
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DatasetInput>({ resolver: zodResolver(datasetSchema) })

  const sourceId = watch("sourceId")

  function onSubmit(data: DatasetInput) {
    createDataset.mutate(data, {
      onSuccess: (ds) => router.push(`/datasets/${(ds as { id: string }).id}?edit=1`),
    })
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
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="block space-y-1.5">
          <span className="text-sm font-medium">Source</span>
          <Select value={sourceId ?? ""} onValueChange={(v) => setValue("sourceId", v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a source..." />
            </SelectTrigger>
            <SelectContent>
              {sources.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.sourceId && <p className="text-xs text-destructive">{errors.sourceId.message}</p>}
        </div>

        <div className="block space-y-1.5">
          <Label htmlFor="sql">SQL Query</Label>
          <Textarea
            id="sql"
            {...register("sql")}
            rows={8}
            placeholder="SELECT * FROM orders WHERE created_at > '2024-01-01'"
            className="min-h-[160px] font-mono text-xs"
          />
          {errors.sql && <p className="text-xs text-destructive">{errors.sql.message}</p>}
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting || createDataset.isPending}>
            Create Dataset
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function NewDatasetPage() {
  return (
    <Protected
      permissions={["datasets:create"]}
      fallback={
        <div className="p-8 text-center">
          <h3 className="text-lg font-semibold">Akses ditolak</h3>
          <p className="text-on-surface-variant">Butuh permission datasets:create.</p>
        </div>
      }
    >
      <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
        <NewDatasetContent />
      </Suspense>
    </Protected>
  )
}
