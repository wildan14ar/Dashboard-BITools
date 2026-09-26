import { toNextJsHandler } from "better-auth/next-js"
import { auth } from "@/middlewares/auth"

export const { GET, POST } = toNextJsHandler(auth)
