import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/**
 * Prisma 7 (engine "client") requiere un driver adapter o Accelerate.
 * Para Postgres local usaremos @prisma/adapter-pg + pg.Pool.
 * Esto funciona en Next.js (Node runtime) y en scripts (seed).
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está definido");
  return url;
}

// Pool singleton (evita crear pools múltiples en dev/hot reload)
const pool =
  globalForPrisma.pgPool ??
  new Pool({
    connectionString: getDatabaseUrl(),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pgPool = pool;
}

// Adapter que Prisma usa para hablar con Postgres a través de pg
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    // log: ["query", "error", "warn"], // opcional para debug
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
