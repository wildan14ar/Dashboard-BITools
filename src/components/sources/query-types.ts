export type QueryResult = { columns: string[]; rows: { values: string[] }[]; rowCount: number; executionTimeMs: number } | null
export type TabKind = "table" | "query" | "erd"
export type TabDef = { id: string; kind: TabKind; label: string; sql?: string; erdSchema?: string }
export type TabState = { result: QueryResult; error: string; running: boolean }
