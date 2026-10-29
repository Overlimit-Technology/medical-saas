-- Sesiones multiples en equipos compartidos. Opt-in: apagado por defecto.
ALTER TABLE "ClinicSettings" ADD COLUMN "sharedSessionsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClinicSettings" ADD COLUMN "sharedIdleLockMinutes" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "ClinicSettings" ADD COLUMN "sharedMaxHoursWithoutPassword" INTEGER NOT NULL DEFAULT 8;
