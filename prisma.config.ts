import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// Load .env.local first (dev), then .env as fallback.
dotenv.config({ path: ".env.local" });
dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: env("DATABASE_URL"),
    // opcional si lo necesitas:
    // directUrl: env("DIRECT_URL"),
    // shadowDatabaseUrl: env("SHADOW_DATABASE_URL"),
  },
});
