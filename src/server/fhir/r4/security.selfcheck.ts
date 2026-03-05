import assert from "node:assert/strict";
import { redactSensitiveText, sanitizeForAudit } from "@/server/fhir/r4/logging";
import { checkRateLimit } from "@/server/fhir/r4/rateLimit";

// Verifica redaccion de PII en texto libre.
function checkTextRedaction() {
  const input = "Paciente Juan Perez, RUN 12.345.678-9, correo juan@test.cl, telefono +56912345678";
  const output = redactSensitiveText(input);
  assert.ok(output.includes("[REDACTED_RUN]"), "RUN should be redacted.");
  assert.ok(output.includes("[REDACTED_EMAIL]"), "Email should be redacted.");
  assert.ok(output.includes("[REDACTED_PHONE]"), "Phone should be redacted.");
}

// Verifica enmascarado de campos sensibles en objetos de auditoria.
function checkStructuredRedaction() {
  const payload = sanitizeForAudit({
    firstName: "Juan",
    lastName: "Perez",
    run: "12.345.678-9",
    email: "juan@test.cl",
    notes: "dolor abdominal",
    actor: {
      id: "svc:integration",
    },
  }) as Record<string, unknown>;

  assert.equal(payload.firstName, "[REDACTED]");
  assert.equal(payload.lastName, "[REDACTED]");
  assert.equal(payload.run, "[REDACTED]");
  assert.equal(payload.email, "[REDACTED]");
  assert.equal(payload.notes, "[REDACTED]");
}

// Verifica bloqueo de solicitudes al superar limite de ventana.
function checkRateLimitBlocking() {
  const key = `selfcheck-${Date.now()}`;
  const first = checkRateLimit(key, 2);
  const second = checkRateLimit(key, 2);
  const third = checkRateLimit(key, 2);

  assert.equal(first.allowed, true, "First request should pass.");
  assert.equal(second.allowed, true, "Second request should pass.");
  assert.equal(third.allowed, false, "Third request should be throttled.");
  assert.equal(third.remaining, 0, "Blocked request should have zero remaining.");
}

// Ejecuta la suite minima de seguridad FHIR.
function run() {
  checkTextRedaction();
  checkStructuredRedaction();
  checkRateLimitBlocking();
  // eslint-disable-next-line no-console
  console.log("FHIR security self-check passed.");
}

run();
