"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { FlaskConical, Loader2, UploadCloud } from "lucide-react"
import { useRef, useState } from "react"
import { type FieldError as RHFFieldError, useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldError, Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { uploadSourceFile, useTestSource, useTestSourceConfig } from "@/hooks/use-sources"
import { type SourceInput, sourceSchema } from "@/validations/source"

const DB_TYPES = [
  { value: "postgresql", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "mariadb", label: "MariaDB" },
  { value: "mssql", label: "SQL Server" },
  { value: "sqlite", label: "SQLite" },
  { value: "clickhouse", label: "ClickHouse" },
  { value: "bigquery", label: "BigQuery" },
  { value: "mongodb", label: "MongoDB" },
  { value: "api", label: "API" },
  { value: "file", label: "File (CSV/XLSX/Sheets)" },
] as const

function Field({
  id,
  label: text,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {text}
      </Label>
      {children}
      {error && <FieldError>{error}</FieldError>}
    </div>
  )
}

function SelectField({
  id,
  label: text,
  value,
  options,
  onChange,
  placeholder,
  error,
}: {
  id: string
  label: string
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (v: string) => void
  placeholder?: string
  error?: string
}) {
  return (
    <Field id={id} label={text} error={error}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

/** Uploader chunked (5 MB/chunk) ke POST /api/sources/upload. */
function FileUploader({
  onDone,
  disabled,
}: {
  onDone: (path: string) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [status, setStatus] = useState("")

  async function handleFile(file: File) {
    setStatus("")
    setProgress(0)
    try {
      const res = await uploadSourceFile(file, (received, total) =>
        setProgress(Math.round((received / total) * 100)),
      )
      onDone(res.path)
      setStatus(`Terunggah: ${res.path}`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Upload gagal")
    } finally {
      setProgress(null)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const uploading = progress !== null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <UploadCloud className="size-3.5" />
          )}
          {uploading ? `Mengunggah ${progress}%` : "Pilih & Unggah File"}
        </Button>
        {uploading && (
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleFile(f)
        }}
      />
      {status && <p className="text-xs text-muted-foreground">{status}</p>}
    </div>
  )
}

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => ({
  value: m,
  label: m,
}))

const FILE_KINDS = [
  { value: "upload", label: "Upload file" },
  { value: "url", label: "URL publik" },
  { value: "sheets", label: "Google Sheets" },
]

const FORMATS = [
  { value: "", label: "Otomatis" },
  { value: "csv", label: "CSV" },
  { value: "xlsx", label: "XLSX" },
]

const AUTH_MODES = [
  { value: "none", label: "Publik (anyone with link)" },
  { value: "api_key", label: "API key" },
  { value: "service_account", label: "Service account" },
]

type Props = {
  defaultValues?: Partial<SourceInput>
  onSubmit: (data: SourceInput) => Promise<void> | void
  onCancel: () => void
  submitLabel?: string
  sourceId?: string
}

export function SourceForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  sourceId,
}: Props) {
  const [testResult, setTestResult] = useState("")
  const testExisting = useTestSource()
  const testAdhoc = useTestSourceConfig()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
    setValue,
    watch,
  } = useForm<SourceInput>({
    resolver: zodResolver(sourceSchema),
    defaultValues: {
      type: "postgresql",
      config: { host: "", port: "", user: "", password: "", database: "" },
      ...defaultValues,
    } as SourceInput,
  })

  const selectedType = watch("type")
  const uploadedPath = watch("config.path")
  const headersRaw = watch("config.headers")
  // Default "upload" supaya panel file langsung tampil begitu tipe dipilih.
  const fileKind = (watch("config.kind") as string) || "upload"

  function handleTest() {
    setTestResult("")
    if (sourceId) {
      testExisting.mutate(sourceId, {
        onSuccess: (d) => setTestResult(d.ok ? "Connected" : (d.error ?? "Failed")),
        onError: () => setTestResult("Connection failed"),
      })
    } else {
      testAdhoc.mutate(
        {
          name: getValues("name") || "adhoc",
          type: getValues("type"),
          config: getValues("config"),
        },
        {
          onSuccess: (d) => setTestResult(d.ok ? "Connected" : (d.error ?? "Failed")),
          onError: () => setTestResult("Connection failed"),
        },
      )
    }
  }

  const testing = testExisting.isPending || testAdhoc.isPending
  const cfgErr = (t: string) => (errors.config?.[t] as RHFFieldError | undefined)?.message

  // headers disimpan sebagai record di DB, tapi diketik sebagai JSON di form.
  const headersText =
    typeof headersRaw === "string" ? headersRaw : JSON.stringify(headersRaw ?? {}, null, 2)

  const submit = handleSubmit(async (data) => {
    let config = data.config
    if (data.type === "api") {
      try {
        const parsed = headersText.trim() ? JSON.parse(headersText) : {}
        config = { ...config, headers: parsed as Record<string, string> }
      } catch {
        // biarkan string apa adanya; zod akan menolak dengan pesan yang jelas
      }
    }
    await onSubmit({ ...data, config })
  })

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...register("name")} placeholder="Production DB" />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="type">Type</Label>
        <Select
          value={selectedType}
          onValueChange={(v) => setValue("type", v as SourceInput["type"])}
        >
          <SelectTrigger id="type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DB_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <fieldset className="rounded-lg border p-4 space-y-3">
        <legend className="text-sm font-medium px-1">Connection</legend>

        {selectedType === "bigquery" && (
          <div className="grid grid-cols-1 gap-3">
            <Field id="config-project" label="Project" error={cfgErr("project")}>
              <Input id="config-project" {...register("config.project")} placeholder="my-project" />
            </Field>
            <Field id="config-dataset" label="Dataset" error={cfgErr("dataset")}>
              <Input id="config-dataset" {...register("config.dataset")} placeholder="analytics" />
            </Field>
            <Field
              id="config-credentials_path"
              label="Credentials Path"
              error={cfgErr("credentials_path")}
            >
              <Input
                id="config-credentials_path"
                {...register("config.credentials_path")}
                placeholder="/path/to/key.json"
              />
            </Field>
          </div>
        )}

        {selectedType === "mongodb" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field
                id="config-connection_string"
                label="Connection String"
                error={cfgErr("connection_string")}
              >
                <Input
                  id="config-connection_string"
                  {...register("config.connection_string")}
                  placeholder="mongodb://localhost:27017"
                />
              </Field>
            </div>
            <Field id="config-database-mongodb" label="Database" error={cfgErr("database")}>
              <Input
                id="config-database-mongodb"
                {...register("config.database")}
                placeholder="mydb"
              />
            </Field>
          </div>
        )}

        {selectedType === "api" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field id="config-base_url" label="Base URL" error={cfgErr("base_url")}>
                <Input
                  id="config-base_url"
                  {...register("config.base_url")}
                  placeholder="https://api.example.com"
                />
              </Field>
            </div>
            <SelectField
              id="config-method"
              label="Method"
              value={(getValues("config.method") as string) || "GET"}
              options={HTTP_METHODS}
              onChange={(v) => setValue("config.method", v, { shouldDirty: true })}
            />
            <Field id="config-path" label="Path" error={cfgErr("path")}>
              <Input id="config-path" {...register("config.path")} placeholder="/users/{id}" />
            </Field>
            <div className="col-span-2">
              <Field id="config-headers" label="Headers (JSON)" error={cfgErr("headers")}>
                <Textarea
                  id="config-headers"
                  rows={3}
                  spellCheck={false}
                  className="font-mono text-xs"
                  value={headersText}
                  onChange={(e) =>
                    setValue("config.headers", e.target.value, { shouldDirty: true })
                  }
                  placeholder='{"Authorization": "Bearer xxx"}'
                />
              </Field>
            </div>
            <div className="col-span-2">
              <Field id="config-body" label="Body (JSON)">
                <Input id="config-body" {...register("config.body")} placeholder="{}" />
              </Field>
            </div>
          </div>
        )}

        {selectedType === "file" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <SelectField
                id="config-kind"
                label="Sumber File"
                value={fileKind}
                options={FILE_KINDS}
                onChange={(v) => setValue("config.kind", v, { shouldDirty: true })}
              />
            </div>

            {fileKind === "upload" && (
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">File CSV/XLSX</Label>
                <FileUploader
                  disabled={isSubmitting}
                  onDone={(p) =>
                    setValue("config.path", p, { shouldValidate: true, shouldDirty: true })
                  }
                />
                <Input
                  id="config-path"
                  {...register("config.path")}
                  placeholder="uploads/<id>.xlsx"
                />
                {typeof uploadedPath === "string" && uploadedPath !== "" && (
                  <p className="text-xs text-muted-foreground">Path tersimpan: {uploadedPath}</p>
                )}
                {cfgErr("path") && <FieldError>{cfgErr("path")}</FieldError>}
              </div>
            )}

            {fileKind === "url" && (
              <>
                <div className="col-span-2">
                  <Field
                    id="config-file_url"
                    label="File URL (http/https publik)"
                    error={cfgErr("file_url")}
                  >
                    <Input
                      id="config-file_url"
                      {...register("config.file_url")}
                      placeholder="https://example.com/data.csv"
                    />
                  </Field>
                </div>
                <SelectField
                  id="config-format"
                  label="Format (otomatis bila kosong)"
                  value={(getValues("config.format") as string) ?? ""}
                  options={FORMATS}
                  onChange={(v) => setValue("config.format", v, { shouldDirty: true })}
                />
              </>
            )}

            {fileKind === "sheets" && (
              <>
                <div className="col-span-2">
                  <Field
                    id="config-spreadsheet_id"
                    label="Spreadsheet ID atau share-link"
                    error={cfgErr("spreadsheet_id")}
                  >
                    <Input
                      id="config-spreadsheet_id"
                      {...register("config.spreadsheet_id")}
                      placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    />
                  </Field>
                </div>
                <Field id="config-sheet" label="Nama sheet (opsional)">
                  <Input id="config-sheet" {...register("config.sheet")} placeholder="Sheet1" />
                </Field>
                <Field id="config-gid" label="GID (opsional)">
                  <Input id="config-gid" {...register("config.gid")} placeholder="0" />
                </Field>
                <SelectField
                  id="config-auth"
                  label="Akses"
                  value={(getValues("config.auth") as string) || "none"}
                  options={AUTH_MODES}
                  onChange={(v) => setValue("config.auth", v, { shouldDirty: true })}
                />
                <Field
                  id="config-api_key"
                  label="API key (bila akses API key)"
                  error={cfgErr("api_key")}
                >
                  <Input
                    id="config-api_key"
                    {...register("config.api_key")}
                    placeholder="AIza..."
                  />
                </Field>
                <div className="col-span-2">
                  <Field
                    id="config-service_account_json"
                    label="Service account JSON"
                    error={cfgErr("service_account_json")}
                  >
                    <Textarea
                      id="config-service_account_json"
                      rows={3}
                      spellCheck={false}
                      className="font-mono text-xs"
                      {...register("config.service_account_json")}
                      placeholder='{"type": "service_account", ...}'
                    />
                  </Field>
                </div>
              </>
            )}
          </div>
        )}

        {!["bigquery", "mongodb", "api", "file"].includes(selectedType) && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Field id="config-host" label="Host" error={cfgErr("host")}>
                <Input id="config-host" {...register("config.host")} placeholder="localhost" />
              </Field>
              <Field id="config-port" label="Port" error={cfgErr("port")}>
                <Input id="config-port" {...register("config.port")} placeholder="5432" />
              </Field>
              <Field id="config-database" label="Database" error={cfgErr("database")}>
                <Input id="config-database" {...register("config.database")} placeholder="mydb" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field id="config-user" label="User" error={cfgErr("user")}>
                <Input id="config-user" {...register("config.user")} placeholder="postgres" />
              </Field>
              <Field id="config-password" label="Password" error={cfgErr("password")}>
                <Input
                  id="config-password"
                  type="password"
                  {...register("config.password")}
                  placeholder="password"
                />
              </Field>
            </div>
          </>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting || testing}>
          {isSubmitting && <Loader2 className="size-3.5 mr-2 animate-spin" />}
          {submitLabel}
        </Button>
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="ghost" type="button" onClick={handleTest} disabled={testing}>
          {testing ? (
            <Loader2 className="size-3.5 mr-2 animate-spin" />
          ) : (
            <FlaskConical className="size-3.5" />
          )}
          Test Connection
        </Button>
        {testResult && (
          <span
            className={
              testResult === "Connected" ? "text-sm text-green-600" : "text-sm text-destructive"
            }
          >
            {testResult}
          </span>
        )}
      </div>
    </form>
  )
}
