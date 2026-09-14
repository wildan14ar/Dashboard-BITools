"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { FlaskConical } from "lucide-react"
import { useState } from "react"
import { type FieldError, useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { useTestSource, useTestSourceAdhoc } from "@/hooks/use-sources"
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
]

type Props = {
  defaultValues?: Partial<SourceInput>
  onSubmit: (data: SourceInput) => Promise<void>
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
  const testAdhoc = useTestSourceAdhoc()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
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

  function handleTest() {
    setTestResult("")
    if (sourceId) {
      testExisting.mutate(sourceId, {
        onSuccess: (d) => setTestResult(d.ok ? "Connected" : (d.error ?? "Failed")),
        onError: () => setTestResult("Connection failed"),
      })
    } else {
      testAdhoc.mutate(
        { type: getValues("type"), config: getValues("config") },
        {
          onSuccess: (d) => setTestResult(d.ok ? "Connected" : (d.error ?? "Failed")),
          onError: () => setTestResult("Connection failed"),
        },
      )
    }
  }

  const testing = testExisting.isPending || testAdhoc.isPending
  const cfgErr = (t: keyof SourceInput["config"]) =>
    (errors.config?.[t] as FieldError | undefined)?.message

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Name</span>
        <input {...register("name")} placeholder="Production DB" className="input" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Type</span>
        <select {...register("type")} className="input">
          {DB_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="rounded-lg border p-4 space-y-3">
        <legend className="text-sm font-medium px-1">Connection</legend>

        {selectedType === "bigquery" && (
          <div className="grid grid-cols-1 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium">Project</span>
              <input {...register("config.project")} placeholder="my-project" className="input" />
              {cfgErr("project") && <p className="text-xs text-destructive">{cfgErr("project")}</p>}
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium">Dataset</span>
              <input {...register("config.dataset")} placeholder="analytics" className="input" />
              {cfgErr("dataset") && <p className="text-xs text-destructive">{cfgErr("dataset")}</p>}
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium">Credentials Path</span>
              <input
                {...register("config.credentials_path")}
                placeholder="/path/to/key.json"
                className="input"
              />
              {cfgErr("credentials_path") && (
                <p className="text-xs text-destructive">{cfgErr("credentials_path")}</p>
              )}
            </label>
          </div>
        )}

        {selectedType === "mongodb" && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1 col-span-2">
              <span className="text-xs font-medium">Connection String</span>
              <input
                {...register("config.connection_string")}
                placeholder="mongodb://localhost:27017"
                className="input"
              />
              {cfgErr("connection_string") && (
                <p className="text-xs text-destructive">{cfgErr("connection_string")}</p>
              )}
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium">Database</span>
              <input {...register("config.database")} placeholder="mydb" className="input" />
              {cfgErr("database") && (
                <p className="text-xs text-destructive">{cfgErr("database")}</p>
              )}
            </label>
          </div>
        )}

        {selectedType === "api" && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1 col-span-2">
              <span className="text-xs font-medium">Base URL</span>
              <input
                {...register("config.base_url")}
                placeholder="https://api.example.com"
                className="input"
              />
              {cfgErr("base_url") && (
                <p className="text-xs text-destructive">{cfgErr("base_url")}</p>
              )}
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium">Method</span>
              <select {...register("config.method")} className="input">
                {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium">Path</span>
              <input {...register("config.path")} placeholder="/users/{id}" className="input" />
              {cfgErr("path") && <p className="text-xs text-destructive">{cfgErr("path")}</p>}
            </label>
            <label className="block space-y-1 col-span-2">
              <span className="text-xs font-medium">Headers (JSON)</span>
              <input
                {...register("config.headers")}
                placeholder='{"Authorization": "Bearer xxx"}'
                className="input"
              />
              {cfgErr("headers") && <p className="text-xs text-destructive">{cfgErr("headers")}</p>}
            </label>
            <label className="block space-y-1 col-span-2">
              <span className="text-xs font-medium">Body (JSON)</span>
              <input {...register("config.body")} placeholder="{}" className="input" />
            </label>
          </div>
        )}

        {!["bigquery", "mongodb", "api"].includes(selectedType) && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-medium">Host</span>
                <input {...register("config.host")} placeholder="localhost" className="input" />
                {cfgErr("host") && <p className="text-xs text-destructive">{cfgErr("host")}</p>}
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium">Port</span>
                <input {...register("config.port")} placeholder="5432" className="input" />
                {cfgErr("port") && <p className="text-xs text-destructive">{cfgErr("port")}</p>}
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium">Database</span>
                <input {...register("config.database")} placeholder="mydb" className="input" />
                {cfgErr("database") && (
                  <p className="text-xs text-destructive">{cfgErr("database")}</p>
                )}
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-medium">User</span>
                <input {...register("config.user")} placeholder="postgres" className="input" />
                {cfgErr("user") && <p className="text-xs text-destructive">{cfgErr("user")}</p>}
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium">Password</span>
                <input
                  type="password"
                  {...register("config.password")}
                  placeholder="password"
                  className="input"
                />
                {cfgErr("password") && (
                  <p className="text-xs text-destructive">{cfgErr("password")}</p>
                )}
              </label>
            </div>
          </>
        )}
      </fieldset>

      <div className="flex items-center gap-2 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting || testExisting.isPending || testAdhoc.isPending}
        >
          {submitLabel}
        </Button>
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="ghost" type="button" onClick={handleTest} disabled={testing}>
          <FlaskConical className="size-3.5" /> Test Connection
        </Button>
        {testResult && (
          <span
            className={
              testResult === "Connected" ? "text-sm text-green-600" : "text-sm text-red-600"
            }
          >
            {testResult}
          </span>
        )}
      </div>
    </form>
  )
}
