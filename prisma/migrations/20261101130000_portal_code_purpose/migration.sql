-- Portal del paciente: los codigos por correo tambien sirven para recuperar la contrasena.
ALTER TABLE "PatientPortalCode" ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'SIGNUP';
