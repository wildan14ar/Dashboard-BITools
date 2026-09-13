"use client"

import { useState, useEffect } from "react"
import Editor from "@monaco-editor/react"
import { Play, Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { useCreateDataset } from "@/hooks/use-datasets"
import type { TabDef, TabState } from "@/components/sources/query-types"

export function QueryEditorArea({ tab, state, sourceId, onSqlChange, onRun, editorHeight, onEditorResizeStart }: {
  tab: TabDef
  state: TabState
  sourceId: string
  onSqlChange: (sql: string) => void
  onRun: () => void
  editorHeight: number
  onEditorResizeStart: () => void
}) {
  const [theme, setTheme] = useState<"vs-dark" | "vs">("vs-dark")
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState("")
  const createDataset = useCreateDataset()

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)")
    function update() { setTheme(mq.matches ? "vs" : "vs-dark") }
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="shrink-0" style={{ height: editorHeight }}>
        <Editor
          height="100%"
          defaultLanguage="sql"
          value={tab.sql}
          onChange={(v) => onSqlChange(v ?? "")}
          onMount={(editor) => {
            editor.addAction({
              id: "run-query",
              label: "Run Query",
              keybindings: [2048 | 3], // Ctrl+Enter
              run: () => onRun(),
            })
          }}
          theme={theme}
          options={{
            minimap: { enabled: false },
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace",
            fontSize: 13,
            lineHeight: 22,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: "line",
            cursorBlinking: "smooth",
            smoothScrolling: true,
            bracketPairColorization: { enabled: true },
            automaticLayout: true,
            suggest: { showWords: false },
            wordBasedSuggestions: "off",
            quickSuggestions: false,
          }}
        />
      </div>

      <div
        className="h-1 bg-border cursor-row-resize hover:bg-primary/30 shrink-0"
        onMouseDown={(e) => { e.preventDefault(); onEditorResizeStart() }}
      />

      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <div className="flex items-center gap-2 border-b px-3 py-1 shrink-0">
          {state.result && (
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {state.result.columns.length} col · {state.result.rowCount.toLocaleString()} rows · {state.result.executionTimeMs}ms
            </span>
          )}
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-[10px]"
            onClick={() => { setSaveName(tab.label); setSaveOpen(true) }}
          >
            <Save className="size-3" /> Save
          </Button>
          <Button
            size="sm"
            className="h-6 gap-1 px-2 text-[10px]"
            onClick={onRun}
            disabled={state.running}
          >
            {state.running ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
            Run
          </Button>
        </div>

        <Dialog open={saveOpen} onClose={() => setSaveOpen(false)} title="Save to Dataset">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!saveName.trim()) return
              createDataset.mutate({ name: saveName.trim(), sql: tab.sql ?? "", sourceId })
              setSaveOpen(false)
            }}
            className="flex flex-col gap-4 min-w-[320px]"
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="flex h-9 rounded-md border bg-transparent px-3 py-1 text-sm outline-none focus:border-ring"
                placeholder="Dataset name"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setSaveOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={createDataset.isPending}>
                {createDataset.isPending ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                Save Dataset
              </Button>
            </div>
          </form>
        </Dialog>

        <div className="flex-1 overflow-auto">
          {state.error && (
            <div className="p-4"><div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 font-mono text-xs text-destructive">{state.error}</div></div>
          )}
          {state.running && (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Executing query...</div>
          )}
          {state.result && (
            <div className="overflow-auto">
              <table className="w-full text-xs border-separate border-spacing-0">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="sticky left-0 z-20 bg-muted border-b border-r px-2 py-1.5 text-left text-[10px] font-medium text-muted-foreground w-8 select-none">#</th>
                    {state.result.columns.map((c) => <th key={c} className="border-b bg-muted px-3 py-1.5 text-left text-[10px] font-semibold whitespace-nowrap">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {state.result.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="sticky left-0 bg-background border-r px-2 py-1 text-[10px] text-muted-foreground/50 text-right select-none">{i + 1}</td>
                      {row.values.map((v, j) => (
                        <td key={j} className="px-3 py-1 font-mono text-[11px] whitespace-nowrap max-w-[400px] truncate">{v == null ? <span className="italic text-muted-foreground/40">NULL</span> : v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!state.result && !state.error && !state.running && (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground/50">Press Ctrl+Enter to execute</div>
          )}
        </div>
      </div>
    </div>
  )
}
