-- Sala de espera: estado de llegada persistido por cita.
-- El estado se deriva: arrivedAt != null -> en sala; delayMinutes != null -> con demora; si no -> en espera.
ALTER TABLE "Appointment" ADD COLUMN "arrivedAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN "delayMinutes" INTEGER;
ALTER TABLE "Appointment" ADD COLUMN "arrivalNotifiedAt" TIMESTAMP(3);

-- Listado de la sala de espera del dia por sede.
CREATE INDEX "Appointment_clinicId_arrivedAt_idx" ON "Appointment"("clinicId", "arrivedAt");

-- Nuevo tipo de alerta interna para avisar al profesional que su paciente llego.
ALTER TYPE "InternalAlertType" ADD VALUE 'PATIENT_ARRIVED' BEFORE 'PAYMENT_PENDING';
