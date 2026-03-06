import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client.js";

let prisma: PrismaClient | null = null;

export function initDatabase(databaseUrl: string): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  prisma = new PrismaClient({ adapter });
  return prisma;
}

export function getDatabase(): PrismaClient {
  if (!prisma) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return prisma;
}

export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
