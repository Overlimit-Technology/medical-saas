// Carga los datos de prueba (clinicas, pacientes, citas, cuentas) en la base indicada por DATABASE_URL.
//
// Uso:
//   npm run seed:test                 sede completa + cuentas de prueba
//   npm run seed:test:accounts        solo las cuentas adicionales (requiere haber sembrado antes)
//   npm run seed:test -- --force      siembra aunque la base tenga usuarios que no son de prueba
//
// Proteccion: si la base contiene usuarios reales (ids que no empiezan con "seed_"), el script se niega
// a continuar. Asi no se pueden crear cuentas con clave conocida en produccion por accidente.

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const args = new Set(process.argv.slice(2));
const force = args.has("--force");
const accountsOnly = args.has("--accounts-only");

const here = path.dirname(fileURLToPath(import.meta.url));
const prismaDir = path.join(here, "..", "prisma");

const url = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
if (!url) {
  console.error("Falta DATABASE_URL en el entorno (.env).");
  process.exit(1);
}

const host = new URL(url).hostname;
const client = new pg.Client({ connectionString: url });

async function main() {
  await client.connect();

  const { rows } = await client.query(`select count(*)::int as n from "User" where id not like 'seed\\_%'`);
  const realUsers = rows[0].n;

  console.log(`Base destino: ${host}`);
  console.log(`Usuarios que no son de prueba: ${realUsers}`);

  if (realUsers > 0 && !force) {
    console.error(
      "\nABORTO: esta base tiene usuarios reales. No se siembra para no crear cuentas de prueba con clave conocida.\n" +
        "Si es una base solo de pruebas y estas seguro, repite con --force."
    );
    process.exitCode = 2;
    return;
  }

  const files = accountsOnly
    ? ["test-seed-env-accounts.sql"]
    : ["test-seed-current-month.sql", "test-seed-env-accounts.sql", "test-seed-billing.sql", "test-seed-dashboard.sql"];

  for (const file of files) {
    const sql = fs.readFileSync(path.join(prismaDir, file), "utf8");
    process.stdout.write(`Ejecutando ${file}... `);
    await client.query(sql);
    console.log("listo");
  }

  const counts = await client.query(`
    select
      (select count(*)::int from "User" where id like 'seed\\_%') as usuarios,
      (select count(*)::int from "Clinic") as clinicas,
      (select count(*)::int from "Patient") as pacientes,
      (select count(*)::int from "Appointment") as citas
  `);
  console.log("\nResultado:", JSON.stringify(counts.rows[0]));
  console.log("Cuentas y clave: ver docs/CUENTAS-DE-PRUEBA.md");
}

main()
  .catch((error) => {
    console.error("Error al sembrar:", error.message);
    process.exitCode = 1;
  })
  .finally(() => client.end());
