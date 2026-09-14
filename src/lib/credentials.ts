import { ulid } from "ulid"
import prisma from "@/config/prisma"
import { hashPassword } from "@/lib/hash"

// issuer "local:credential" = format createLocalAccountIssuer() Better Auth v1.7
const LOCAL_ISSUER = "local:credential"

// Buat/update password di Better Auth Account (providerId "credential").
// accountId = userId, konsisten dengan konvensi Better Auth.
export async function setCredentialPassword(userId: string, password: string) {
  const hashed = await hashPassword(password)
  await prisma.account.upsert({
    where: {
      issuer_accountId: { issuer: LOCAL_ISSUER, accountId: userId },
    },
    update: { password: hashed },
    create: {
      id: ulid(),
      issuer: LOCAL_ISSUER,
      providerId: "credential",
      accountId: userId,
      userId,
      password: hashed,
    },
  })
}
