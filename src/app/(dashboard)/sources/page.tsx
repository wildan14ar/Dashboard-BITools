"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import axios from "axios"
import { Plus, Trash2, FlaskConical, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"

type Source = {
  id: string
  name: string
  type: string
  config: Record<string, unknown> | null
  createdAt: string
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, string>>({})

  useEffect(() => { fetchSources() }, [])

  async function fetchSources() {
    setLoading(true)
    const { data } = await axios.get("/api/sources")
    setSources(data)
    setLoading(false)
  }

  async function handleTest(source: Source) {
    setTesting(source.id)
    setTestResult((p) => ({ ...p, [source.id]: "" }))
    try {
      const { data } = await axios.post(`/api/sources/${source.id}/test`)
      setTestResult((p) => ({ ...p, [source.id]: data.ok ? "Connected" : data.error }))
    } catch (err) {
      setTestResult((p) => ({ ...p, [source.id]: String(err) }))
    }
    setTesting(null)
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this source?")) return
    await axios.delete(`/api/sources/${id}`)
    fetchSources()
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Data Sources</h1>
        <Link href="/sources/new">
          <Button><Plus className="size-4" /> New Source</Button>
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">Type</th>
              <th className="px-4 py-2 text-left font-medium">Created</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : sources.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No sources yet</td></tr>
            ) : (
              sources.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{s.name}</td>
                  <td className="px-4 py-2"><code className="rounded bg-muted px-1 py-0.5 text-xs">{s.type}</code></td>
                  <td className="px-4 py-2 text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {testResult[s.id] && (
                        <span className={cn("mr-2 text-xs", testResult[s.id] === "Connected" ? "text-green-600" : "text-red-600")}>
                          {testResult[s.id]}
                        </span>
                      )}
                      <Button variant="ghost" size="xs" onClick={() => handleTest(s)} disabled={testing === s.id}>
                        <FlaskConical className="size-3.5" />
                      </Button>
                      <Link href={`/sources/${s.id}`}>
                        <Button variant="ghost" size="xs"><Eye className="size-3.5" /></Button>
                      </Link>
                      <Button variant="ghost" size="xs" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
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

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
