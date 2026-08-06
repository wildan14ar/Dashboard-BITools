"use client"

import Link from "next/link"
import { Plus, Trash2, Play, Edit3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDatasets, useDeleteDataset } from "@/hooks/use-datasets"

export default function DatasetsPage() {
  const { data: datasets = [], isLoading } = useDatasets()
  const deleteDataset = useDeleteDataset()

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Datasets</h1>
        <Link href="/datasets/new">
          <Button><Plus className="size-4" /> New Dataset</Button>
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">Last Run</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : datasets.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No datasets yet</td></tr>
            ) : (
              datasets.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="px-4 py-2">
                    <Link href={`/datasets/${d.id}`} className="font-medium hover:underline">{d.name}</Link>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{d.lastRunAt ? new Date(d.lastRunAt).toLocaleString() : "Never"}</td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/datasets/${d.id}`}>
                      <Button variant="ghost" size="xs"><Play className="size-3.5" /></Button>
                    </Link>
                    <Link href={`/datasets/${d.id}?edit=1`}>
                      <Button variant="ghost" size="xs"><Edit3 className="size-3.5" /></Button>
                    </Link>
                    <Button variant="ghost" size="xs" onClick={() => { if (confirm("Delete this dataset?")) deleteDataset.mutate(d.id) }}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
