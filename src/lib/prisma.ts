import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import { Pool } from "pg";

/**
 * Prisma 7 (engine "client") requiere un driver adapter o Accelerate.
 * Para Postgres local usaremos @prisma/adapter-pg + pg.Pool.
 * Esto funciona en Next.js (Node runtime) y en scripts (seed).
 */

// Load env for scripts (seed) and local dev.
dotenv.config({ path: ".env.local" });
dotenv.config();

function createPrismaClient(adapter: PrismaPg) {
  return new PrismaClient({
    adapter,
    // Seguridad: passwordHash nunca se devuelve por defecto (ni con include ni por relaciones).
    // Solo el login y el cambio de contrasena lo leen, con select explicito.
    omit: { user: { passwordHash: true }, patientAccount: { passwordHash: true } },
    // log: ["query", "error", "warn"], // opcional para debug
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
  pgPool: Pool | undefined;
};

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
  if (!url) throw new Error("DATABASE_URL o DIRECT_URL debe estar definido");
  return url;
}

// Pool singleton (evita crear pools múltiples en dev/hot reload)
const isProduction = process.env.NODE_ENV === "production";

const pool =
  globalForPrisma.pgPool ??
  new Pool({
    connectionString: getDatabaseUrl(),
    ssl: isProduction ? { rejectUnauthorized: false } : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pgPool = pool;
}

// Adapter que Prisma usa para hablar con Postgres a través de pg
const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? createPrismaClient(adapter);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

