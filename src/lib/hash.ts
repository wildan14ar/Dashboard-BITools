import { hash, verify } from "@node-rs/argon2"

const argon2Options = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
}

export const hashPassword = async (password: string) => {
  return await hash(password, argon2Options)
}

export const verifyPassword = async (password: string, hashValue: string) => {
  return await verify(hashValue, password, argon2Options)
}
