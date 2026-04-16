ALTER TABLE "PaymentHistory"
ADD COLUMN "appointmentId" TEXT;

CREATE UNIQUE INDEX "PaymentHistory_appointmentId_key"
ON "PaymentHistory"("appointmentId");

ALTER TABLE "PaymentHistory"
ADD CONSTRAINT "PaymentHistory_appointmentId_fkey"
FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
