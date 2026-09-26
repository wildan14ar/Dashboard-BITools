import path from "node:path"
import * as grpc from "@grpc/grpc-js"
import * as protoLoader from "@grpc/proto-loader"
import type { ProtoGrpcType } from "@/lib/grpc/engine"
import { ResponseHandler } from "@/middlewares/response-handler"

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
    fn((err: grpc.ServiceError | null, response?: T) => {
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

// gRPC status codes (subset yang dipakai engine).
const GRPC_PERMISSION_DENIED = 7
const GRPC_INVALID_ARGUMENT = 3

function grpcCode(err: unknown): number | null {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: unknown }).code
    return typeof code === "number" ? code : null
  }
  return null
}

/**
 * Petakan error engine ke respons HTTP yang aman: detail driver mentah
 * (host, user, potongan connection string) TIDAK PERNAH diteruskan ke client.
 * Hanya pesan sanitizer/validasi yang aman ditampilkan verbatim.
 */
export function mapEngineError(err: unknown): { status: 400 | 403 | 500; message: string } {
  const details = cleanError(err)
  const code = grpcCode(err)
  if (code === GRPC_PERMISSION_DENIED || /blocked by sanitizer/i.test(details)) {
    return { status: 403, message: "Query tidak diizinkan: hanya query baca yang didukung" }
  }
  if (code === GRPC_INVALID_ARGUMENT || /^Missing query parameters/i.test(details)) {
    return { status: 400, message: details }
  }
  return { status: 500, message: "Source tidak terjangkau atau query gagal. Cek log server." }
}

/** Helper route: detail driver tetap di log server, client terima pesan aman. */
export function engineErrorResponse(err: unknown) {
  const mapped = mapEngineError(err)
  if (mapped.status === 403) return ResponseHandler.forbidden(mapped.message)
  if (mapped.status === 400) return ResponseHandler.badRequest(mapped.message)
  return ResponseHandler.internalError(mapped.message)
}
