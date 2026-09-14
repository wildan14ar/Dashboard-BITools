import "dotenv/config"
import prisma from "../../src/config/prisma"
import { seedPermissions } from "./permissions"
import { seedUsers } from "./users"

async function main() {
  console.log("🌱 Seeding database...")

  await seedPermissions(prisma)
  await seedUsers(prisma)

  console.log("✅ Database seeding completed!")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
