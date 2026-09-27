"use client"

import { Loader2, UploadCloud } from "lucide-react"
import { useState } from "react"
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
import { type SourceType, uploadSourceFile } from "@/hooks/use-sources"

type Config = Record<string, unknown>

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
}: {
  id: string
  label: string
  value: unknown
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  disabled?: boolean
}) {
  return (
    <Field id={id} label={label}>
      <Input
        id={id}
        type={type}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </Field>
  )
}

function TypeSelect({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  id: string
  label: string
  value: string
  options: readonly string[]
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <Field id={id} label={label}>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

function FileUploadField({
  idPrefix,
  path,
  onUploaded,
  disabled,
}: {
  idPrefix: string
  path: unknown
  onUploaded: (path: string) => void
  disabled?: boolean
}) {
  const [progress, setProgress] = useState<{ received: number; total: number } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    setError(null)
    setProgress({ received: 0, total: 1 })
    try {
      const res = await uploadSourceFile(file, (received, total) =>
        setProgress({ received, total }),
      )
      onUploaded(res.path)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload gagal")
    } finally {
      setUploading(false)
      setProgress(null)
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <Label htmlFor={`${idPrefix}-file`}>File (.csv / .xlsx, chunked 5 MB)</Label>
      <Input
        id={`${idPrefix}-file`}
        type="file"
        accept=".csv,.xlsx"
        disabled={disabled || uploading}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      {uploading && progress && (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          Mengunggah chunk {progress.received}/{progress.total}…
        </p>
      )}
      {typeof path === "string" && path && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <UploadCloud className="h-3 w-3" />
          <code className="font-mono">{path}</code>
        </p>
      )}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  )
}

/**
 * Editor config dinamis per source type. Controlled: `value` + `onChange`
 * mengganti seluruh object config.
 */
export default function SourceConfigFields({
  type,
  value,
  onChange,
  disabled,
  idPrefix = "src-cfg",
}: {
  type: SourceType
  value: Config
  onChange: (next: Config) => void
  disabled?: boolean
  idPrefix?: string
}) {
  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v })
  const str = (key: string) => (typeof value[key] === "string" ? (value[key] as string) : "")

  if (type === "bigquery") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextField
          id={`${idPrefix}-project`}
          label="Project *"
          value={value.project}
          onChange={(v) => set("project", v)}
          disabled={disabled}
        />
        <TextField
          id={`${idPrefix}-dataset`}
          label="Dataset *"
          value={value.dataset}
          onChange={(v) => set("dataset", v)}
          disabled={disabled}
        />
        <div className="sm:col-span-2">
          <TextField
            id={`${idPrefix}-cred`}
            label="Credentials Path *"
            value={value.credentials_path}
            onChange={(v) => set("credentials_path", v)}
            disabled={disabled}
          />
        </div>
      </div>
    )
  }

  if (type === "mongodb") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <TextField
            id={`${idPrefix}-conn`}
            label="Connection String *"
            value={value.connection_string}
            onChange={(v) => set("connection_string", v)}
            disabled={disabled}
          />
        </div>
        <TextField
          id={`${idPrefix}-db`}
          label="Database *"
          value={value.database}
          onChange={(v) => set("database", v)}
          disabled={disabled}
        />
      </div>
    )
  }

  if (type === "api") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <TextField
            id={`${idPrefix}-base`}
            label="Base URL *"
            value={value.base_url}
            onChange={(v) => set("base_url", v)}
            disabled={disabled}
          />
        </div>
        <TypeSelect
          id={`${idPrefix}-method`}
          label="Method"
          value={str("method") || "GET"}
          options={["GET", "POST", "PUT", "PATCH", "DELETE"]}
          onChange={(v) => set("method", v)}
          disabled={disabled}
        />
        <TextField
          id={`${idPrefix}-path`}
          label="Path *"
          value={value.path}
          onChange={(v) => set("path", v)}
          disabled={disabled}
        />
        <div className="sm:col-span-2">
          <Field id={`${idPrefix}-headers`} label="Headers (JSON)">
            <Textarea
              id={`${idPrefix}-headers`}
              rows={3}
              spellCheck={false}
              className="font-mono text-xs"
              value={str("headers") || JSON.stringify(value.headers ?? {}, null, 2)}
              onChange={(e) => {
                try {
                  set("headers", e.target.value.trim() ? JSON.parse(e.target.value) : {})
                } catch {
                  set("headers", e.target.value)
                }
              }}
              disabled={disabled}
            />
          </Field>
        </div>
      </div>
    )
  }

  if (type === "file") {
    const kind = str("kind") || "upload"
    const auth = str("auth") || "none"
    return (
      <div className="space-y-3">
        <TypeSelect
          id={`${idPrefix}-kind`}
          label="Kind"
          value={kind}
          options={["upload", "url", "sheets"]}
          onChange={(v) => onChange({ kind: v })}
          disabled={disabled}
        />
        {kind === "upload" && (
          <FileUploadField
            idPrefix={idPrefix}
            path={value.path}
            onUploaded={(p) => set("path", p)}
            disabled={disabled}
          />
        )}
        {kind === "url" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <TextField
                id={`${idPrefix}-fileurl`}
                label="File URL *"
                value={value.file_url}
                onChange={(v) => set("file_url", v)}
                disabled={disabled}
              />
            </div>
            <TypeSelect
              id={`${idPrefix}-format`}
              label="Format"
              value={str("format") || "csv"}
              options={["csv", "xlsx"]}
              onChange={(v) => set("format", v)}
              disabled={disabled}
            />
          </div>
        )}
        {kind === "sheets" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <TextField
                id={`${idPrefix}-sid`}
                label="Spreadsheet ID *"
                value={value.spreadsheet_id}
                onChange={(v) => set("spreadsheet_id", v)}
                disabled={disabled}
              />
            </div>
            <TextField
              id={`${idPrefix}-sheet`}
              label="Sheet"
              value={value.sheet}
              onChange={(v) => set("sheet", v)}
              disabled={disabled}
            />
            <TextField
              id={`${idPrefix}-gid`}
              label="GID"
              value={value.gid}
              onChange={(v) => set("gid", v)}
              disabled={disabled}
            />
            <TypeSelect
              id={`${idPrefix}-auth`}
              label="Auth"
              value={auth}
              options={["none", "api_key", "service_account"]}
              onChange={(v) => set("auth", v)}
              disabled={disabled}
            />
            {auth === "api_key" && (
              <TextField
                id={`${idPrefix}-apikey`}
                label="API Key *"
                value={value.api_key}
                onChange={(v) => set("api_key", v)}
                disabled={disabled}
              />
            )}
            {auth === "service_account" && (
              <div className="sm:col-span-2">
                <Field id={`${idPrefix}-sa`} label="Service Account JSON *">
                  <Textarea
                    id={`${idPrefix}-sa`}
                    rows={3}
                    spellCheck={false}
                    className="font-mono text-xs"
                    value={str("service_account_json")}
                    onChange={(e) => set("service_account_json", e.target.value)}
                    disabled={disabled}
                  />
                </Field>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // SQL-like types: host/port/user/password/database.
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <TextField
        id={`${idPrefix}-host`}
        label="Host *"
        value={value.host}
        onChange={(v) => set("host", v)}
        disabled={disabled}
      />
      <TextField
        id={`${idPrefix}-port`}
        label="Port *"
        value={value.port}
        onChange={(v) => set("port", v)}
        disabled={disabled}
      />
      <TextField
        id={`${idPrefix}-user`}
        label="User *"
        value={value.user}
        onChange={(v) => set("user", v)}
        disabled={disabled}
      />
      <TextField
        id={`${idPrefix}-pass`}
        label="Password *"
        type="password"
        value={value.password}
        onChange={(v) => set("password", v)}
        disabled={disabled}
      />
      <div className="sm:col-span-2">
        <TextField
          id={`${idPrefix}-db`}
          label="Database *"
          value={value.database}
          onChange={(v) => set("database", v)}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
