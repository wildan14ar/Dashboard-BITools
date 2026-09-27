"use client"

import {
  Background,
  Controls,
  type Edge,
  Handle,
  MarkerType,
  MiniMap,
  type Node,
  Position,
  ReactFlow,
} from "@xyflow/react"
import { ArrowRightLeft, Eye, KeyRound } from "lucide-react"
import { useMemo } from "react"
import "@xyflow/react/dist/style.css"
import type { ColumnInfo, TableItem } from "./query-types"

function TableNode({
  data,
}: {
  data: { label: string; columns: ColumnInfo[]; schema: string; isView: boolean }
}) {
  return (
    <div
      className={
        data.isView
          ? "rounded-lg border-2 border-dashed border-blue-300/40 bg-card shadow-sm text-xs min-w-[200px]"
          : "rounded-lg border bg-card shadow-sm text-xs min-w-[200px]"
      }
    >
      <div className="rounded-t-lg bg-muted px-3 py-1.5 font-semibold text-muted-foreground flex items-center gap-1.5">
        {data.isView && <Eye className="size-3 text-blue-400" />}
        {data.schema !== "public" && <span className="text-[10px] opacity-50">{data.schema}.</span>}
        {data.label}
      </div>
      <div className="divide-y divide-border">
        {data.columns.map((col) => (
          <div key={col.name} className="flex items-center gap-1.5 px-3 py-1">
            {col.isPrimaryKey ? (
              <KeyRound className="size-2.5 shrink-0 text-amber-500" />
            ) : col.foreignKey ? (
              <ArrowRightLeft className="size-2.5 shrink-0 text-blue-400" />
            ) : (
              <span className="w-2.5 shrink-0" />
            )}
            <span className="truncate">{col.name}</span>
            <code className="ml-auto shrink-0 text-[10px] text-muted-foreground">{col.type}</code>
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
    </div>
  )
}

const nodeTypes = { tableNode: TableNode }

function layoutGraph(tables: TableItem[]): { nodes: Node[]; edges: Edge[] } {
  const cols = Math.ceil(Math.sqrt(tables.length))
  const nodeWidth = 220
  const nodeHeight = Math.max(...tables.map((t) => t.columns.length * 26 + 50), 90)
  const gapX = 100
  const gapY = 80

  const nodes: Node[] = tables.map((t, i) => ({
    id: t.name,
    type: "tableNode",
    position: {
      x: (i % cols) * (nodeWidth + gapX),
      y: Math.floor(i / cols) * (nodeHeight + gapY),
    },
    data: { label: t.name, columns: t.columns, schema: t.schema, isView: t.type === "view" },
  }))

  // FK dari engine hanya menyebut nama tabel tanpa schema, sedangkan node id
  // memakai nama polos — jadi cukup cocokkan pada nama.
  const byBareName = new Map<string, string>()
  for (const t of tables) if (!byBareName.has(t.name)) byBareName.set(t.name, t.name)

  const edges: Edge[] = []
  for (const table of tables) {
    for (const col of table.columns) {
      const fkTable = col.foreignKey?.table
      if (!fkTable) continue
      const target = byBareName.get(fkTable)
      if (!target || target === table.name) continue
      edges.push({
        id: `${table.name}.${col.name}->${target}.${col.foreignKey?.column ?? ""}`,
        source: table.name,
        target,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
        style: { stroke: "#94a3b8", strokeWidth: 1 },
      })
    }
  }

  return { nodes, edges }
}

export function SchemaERD({ tables }: { tables: TableItem[] }) {
  const { nodes, edges } = useMemo(() => layoutGraph(tables), [tables])

  if (tables.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No tables found
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={0.5} />
        <Controls />
        <MiniMap nodeStrokeWidth={2} pannable zoomable />
      </ReactFlow>
    </div>
  )
}
