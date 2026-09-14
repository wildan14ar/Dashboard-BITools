import path from "node:path"
import * as grpc from "@grpc/grpc-js"
import * as protoLoader from "@grpc/proto-loader"
import type { ProtoGrpcType } from "@/lib/grpc/engine"

const PROTO_PATH = path.join(process.cwd(), "proto", "engine.proto")

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
})

const proto = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType

const ENGINE_HOST = process.env.QUERY_ENGINE_HOST ?? "localhost:50051"

let _client: InstanceType<typeof proto.engine.QueryEngine> | null = null

function getClient() {
  if (_client) return _client
  _client = new proto.engine.QueryEngine(ENGINE_HOST, grpc.credentials.createInsecure())
  return _client
}

function promisify<T>(fn: (callback: grpc.requestCallback<T>) => grpc.ClientUnaryCall) {
  return new Promise<T>((resolve, reject) => {
    fn((err, response) => {
      if (err) reject(err)
      else resolve(response!)
    })
  })
}

type SourceRef = { sourceId: string; dbType: string; configJson: string }

export async function execute(
  src: SourceRef & {
    sql: string
    maxRows?: number
    timeoutSec?: number
    params?: Record<string, string>
    useCache?: boolean
  },
) {
  const client = getClient()
  return promisify((cb) =>
    client.Execute(
      {
        sourceId: src.sourceId,
        dbType: src.dbType,
        configJson: src.configJson,
        sql: src.sql,
        maxRows: src.maxRows ?? 1000,
        timeoutSec: src.timeoutSec ?? 30,
        params: src.params ?? {},
        useCache: src.useCache ?? true,
      },
      cb,
    ),
  )
}

export function executeStream(
  src: SourceRef & {
    sql: string
    maxRows?: number
    timeoutSec?: number
    params?: Record<string, string>
    useCache?: boolean
  },
) {
  const client = getClient()
  return client.ExecuteStream({
    sourceId: src.sourceId,
    dbType: src.dbType,
    configJson: src.configJson,
    sql: src.sql,
    maxRows: src.maxRows ?? 10000,
    timeoutSec: src.timeoutSec ?? 60,
    params: src.params ?? {},
    useCache: src.useCache ?? true,
  })
}

export async function getSchema(src: SourceRef) {
  const client = getClient()
  return promisify((cb) =>
    client.GetSchema(
      { sourceId: src.sourceId, dbType: src.dbType, configJson: src.configJson },
      cb,
    ),
  )
}

export async function testConnection(params: {
  sourceId: string
  dbType: string
  configJson: string
}) {
  const client = getClient()
  return promisify((cb) =>
    client.TestConnection(
      { sourceId: params.sourceId, dbType: params.dbType, configJson: params.configJson },
      cb,
    ),
  )
}

export async function invalidateCache(sourceId: string) {
  const client = getClient()
  return promisify((cb) => client.InvalidateCache({ sourceId }, cb))
}

export function cleanError(err: unknown): string {
  if (err && typeof err === "object" && "details" in err)
    return String((err as { details: unknown }).details)
  if (err instanceof Error) return err.message
  return String(err)
}
