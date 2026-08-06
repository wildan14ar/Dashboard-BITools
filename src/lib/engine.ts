import * as grpc from "@grpc/grpc-js"
import * as protoLoader from "@grpc/proto-loader"
import path from "node:path"
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

function getClient() {
  return new proto.query_engine.QueryEngine(ENGINE_HOST, grpc.credentials.createInsecure())
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

export async function execute(src: SourceRef & {
  sql: string
  maxRows?: number
  timeoutSec?: number
  params?: Record<string, string>
  useCache?: boolean
  limit?: number
  offset?: number
}) {
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
        limit: src.limit ?? 0,
        offset: src.offset ?? 0,
      },
      cb
    )
  ).finally(() => client.close())
}

export function executeStream(src: SourceRef & {
  sql: string
  maxRows?: number
  timeoutSec?: number
  params?: Record<string, string>
  useCache?: boolean
  limit?: number
  offset?: number
}) {
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
    limit: src.limit ?? 0,
    offset: src.offset ?? 0,
  })
}

export async function getSchema(src: SourceRef) {
  const client = getClient()
  return promisify((cb) => client.GetSchema({ sourceId: src.sourceId, dbType: src.dbType, configJson: src.configJson }, cb)).finally(() => client.close())
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
      cb
    )
  ).finally(() => client.close())
}

export async function invalidateCache(datasetId: string) {
  const client = getClient()
  return promisify((cb) => client.InvalidateCache({ datasetId }, cb)).finally(() => client.close())
}
