"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { FlaskConical } from "lucide-react"
import { useState } from "react"
import { type FieldError as RHFFieldError, useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldError, Label } from "@/components/ui/label"
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
    (errors.config?.[t] as RHFFieldError | undefined)?.message

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="block space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...register("name")} placeholder="Production DB" />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </div>

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
            <div className="block space-y-1">
              <Label htmlFor="config-project" className="text-xs">
                Project
              </Label>
              <Input id="config-project" {...register("config.project")} placeholder="my-project" />
              {cfgErr("project") && <FieldError>{cfgErr("project")}</FieldError>}
            </div>
            <div className="block space-y-1">
              <Label htmlFor="config-dataset" className="text-xs">
                Dataset
              </Label>
              <Input id="config-dataset" {...register("config.dataset")} placeholder="analytics" />
              {cfgErr("dataset") && <FieldError>{cfgErr("dataset")}</FieldError>}
            </div>
            <div className="block space-y-1">
              <Label htmlFor="config-credentials_path" className="text-xs">
                Credentials Path
              </Label>
              <Input
                id="config-credentials_path"
                {...register("config.credentials_path")}
                placeholder="/path/to/key.json"
              />
              {cfgErr("credentials_path") && <FieldError>{cfgErr("credentials_path")}</FieldError>}
            </div>
          </div>
        )}

        {selectedType === "mongodb" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="block space-y-1 col-span-2">
              <Label htmlFor="config-connection_string" className="text-xs">
                Connection String
              </Label>
              <Input
                id="config-connection_string"
                {...register("config.connection_string")}
                placeholder="mongodb://localhost:27017"
              />
              {cfgErr("connection_string") && (
                <FieldError>{cfgErr("connection_string")}</FieldError>
              )}
            </div>
            <div className="block space-y-1">
              <Label htmlFor="config-database-mongodb" className="text-xs">
                Database
              </Label>
              <Input
                id="config-database-mongodb"
                {...register("config.database")}
                placeholder="mydb"
              />
              {cfgErr("database") && <FieldError>{cfgErr("database")}</FieldError>}
            </div>
          </div>
        )}

        {selectedType === "api" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="block space-y-1 col-span-2">
              <Label htmlFor="config-base_url" className="text-xs">
                Base URL
              </Label>
              <Input
                id="config-base_url"
                {...register("config.base_url")}
                placeholder="https://api.example.com"
              />
              {cfgErr("base_url") && <FieldError>{cfgErr("base_url")}</FieldError>}
            </div>
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
            <div className="block space-y-1">
              <Label htmlFor="config-path" className="text-xs">
                Path
              </Label>
              <Input id="config-path" {...register("config.path")} placeholder="/users/{id}" />
              {cfgErr("path") && <FieldError>{cfgErr("path")}</FieldError>}
            </div>
            <div className="block space-y-1 col-span-2">
              <Label htmlFor="config-headers" className="text-xs">
                Headers (JSON)
              </Label>
              <Input
                id="config-headers"
                {...register("config.headers")}
                placeholder='{"Authorization": "Bearer xxx"}'
              />
              {cfgErr("headers") && <FieldError>{cfgErr("headers")}</FieldError>}
            </div>
            <div className="block space-y-1 col-span-2">
              <Label htmlFor="config-body" className="text-xs">
                Body (JSON)
              </Label>
              <Input id="config-body" {...register("config.body")} placeholder="{}" />
            </div>
          </div>
        )}

        {!["bigquery", "mongodb", "api"].includes(selectedType) && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="block space-y-1">
                <Label htmlFor="config-host" className="text-xs">
                  Host
                </Label>
                <Input id="config-host" {...register("config.host")} placeholder="localhost" />
                {cfgErr("host") && <FieldError>{cfgErr("host")}</FieldError>}
              </div>
              <div className="block space-y-1">
                <Label htmlFor="config-port" className="text-xs">
                  Port
                </Label>
                <Input id="config-port" {...register("config.port")} placeholder="5432" />
                {cfgErr("port") && <FieldError>{cfgErr("port")}</FieldError>}
              </div>
              <div className="block space-y-1">
                <Label htmlFor="config-database" className="text-xs">
                  Database
                </Label>
                <Input id="config-database" {...register("config.database")} placeholder="mydb" />
                {cfgErr("database") && <FieldError>{cfgErr("database")}</FieldError>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="block space-y-1">
                <Label htmlFor="config-user" className="text-xs">
                  User
                </Label>
                <Input id="config-user" {...register("config.user")} placeholder="postgres" />
                {cfgErr("user") && <FieldError>{cfgErr("user")}</FieldError>}
              </div>
              <div className="block space-y-1">
                <Label htmlFor="config-password" className="text-xs">
                  Password
                </Label>
                <Input
                  id="config-password"
                  type="password"
                  {...register("config.password")}
                  placeholder="password"
                />
                {cfgErr("password") && <FieldError>{cfgErr("password")}</FieldError>}
              </div>
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
