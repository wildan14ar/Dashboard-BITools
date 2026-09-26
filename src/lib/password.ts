import { hash, verify } from "@node-rs/argon2"
import { ulid } from "ulid"
import prisma from "@/config/prisma"

// Argon2id — satu-satunya skema hash password & API key di repo ini
// (dipakai Better Auth via override, kredensial lokal, dan API keys).
const argon2Options = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
}

export const hashPassword = async (password: string) => {
  return await hash(password, argon2Options)
}

export const verifyPassword = async (password: string, hash: string) => {
  return await verify(hash, password, argon2Options)
}

// ponytail: issuer "local:credential" = format createLocalAccountIssuer() Better Auth v1.7
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
