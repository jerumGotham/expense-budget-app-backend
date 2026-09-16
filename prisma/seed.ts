import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);

  await prisma.user.upsert({
    where: { email: "lara@example.com" },
    update: { passwordHash },
    create: {
      name: "Lara",
      email: "lara@example.com",
      passwordHash,
      profile: {
        create: {
          income: 4000,
          currency: "USD",
          period: "MONTHLY"
        }
      },
      categories: {
        create: [
          { name: "Food", limit: 200, sortOrder: 1 },
          { name: "Utilities", limit: 200, sortOrder: 2 },
          { name: "Groceries", limit: 200, sortOrder: 3 },
          { name: "Transport", limit: 150, sortOrder: 4 },
          { name: "Shopping", limit: 150, sortOrder: 5 }
        ]
      },
      funds: {
        create: [
          { type: "SAVINGS", name: "Savings", percentage: 50 },
          { type: "EMERGENCY", name: "Emergency Fund", percentage: 35 },
          { type: "LUXE", name: "Luxe Fund", percentage: 15 }
        ]
      }
    }
  });

  console.log("Seed complete.");
  console.log("Login: lara@example.com / Password123!");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
