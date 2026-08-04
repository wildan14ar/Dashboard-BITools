import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    isSuperAdmin?: boolean
  }
  interface Session {
    user: DefaultSession["user"] & {
      isSuperAdmin?: boolean
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isSuperAdmin?: boolean
  }
}
