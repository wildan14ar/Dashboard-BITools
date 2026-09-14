import net from "node:net"
import prisma from "@/config/prisma"
import { settings } from "@/config/settings"
import { ResponseHandler } from "@/middlewares/response-handler"

function checkEngine(timeoutMs = 3000): Promise<boolean> {
  const [host, portRaw] = settings.engine.host.includes(":")
    ? settings.engine.host.split(":")
    : [settings.engine.host, String(settings.engine.port)]
  return new Promise((resolve) => {
    const socket = net.connect({ host, port: Number(portRaw) || 50051 })
    const done = (ok: boolean) => {
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(timeoutMs)
    socket.once("connect", () => done(true))
    socket.once("timeout", () => done(false))
    socket.once("error", () => done(false))
  })
}

export async function GET() {
  const [database, engine] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    checkEngine(),
  ])
  const status = { database: database ? "ok" : "fail", engine: engine ? "ok" : "fail" }
  if (!database || !engine) {
    return ResponseHandler.internalError("Degraded", status)
  }
  return ResponseHandler.success("Healthy", status)
}
