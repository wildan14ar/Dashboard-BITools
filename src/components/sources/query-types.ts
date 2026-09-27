export type ColumnInfo = {
  name: string
  type: string
  nullable: boolean
  isPrimaryKey?: boolean
  foreignKey?: { table: string; column: string } | null
}

export type TableItem = {
  name: string
  schema: string
  type: "table" | "view" | "notice"
  columns: ColumnInfo[]
}

export type QueryResult = {
  columns: string[]
  rows: { values: string[] }[]
  row_count?: number
  execution_time_ms?: number
  cached?: boolean
  truncated?: boolean
} | null

export type TabKind = "table" | "query" | "erd"
export type TabDef = {
  id: string
  kind: TabKind
  label: string
  sql?: string
  erdSchema?: string
}
export type TabState = { result: QueryResult; error: string; running: boolean }
