import prismaClient from "@/config/prisma"

// Backward-compat: kode lama import { prisma } from "@/lib/prisma".
// Client tunggal dipakai dari src/config/prisma.ts (pool terpusat ala PortoNext).
export const prisma = prismaClient
export default prismaClient
