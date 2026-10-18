-- Reserva online publica por sede. La llave publica forma la URL /reservar/{bookingKey}.
ALTER TABLE "ClinicSettings" ADD COLUMN "bookingKey" TEXT;
ALTER TABLE "ClinicSettings" ADD COLUMN "bookingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClinicSettings" ADD COLUMN "bookingSlotMinutes" INTEGER NOT NULL DEFAULT 30;

CREATE UNIQUE INDEX "ClinicSettings_bookingKey_key" ON "ClinicSettings"("bookingKey");
