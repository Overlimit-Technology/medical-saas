import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local first (dev), then .env as fallback.
dotenv.config({ path: ".env.local" });
dotenv.config();

const databaseUrl = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
if (!databaseUrl) {
  throw new Error("Missing required environment variable: DATABASE_URL (or DIRECT_URL).");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Neon: DATABASE_URL (pooled) para runtime. Para migraciones puedes sobreescribir
  // DATABASE_URL temporalmente con la URL direct/no-pooling al ejecutar el comando.
  datasource: {
    url: databaseUrl,
    // shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
