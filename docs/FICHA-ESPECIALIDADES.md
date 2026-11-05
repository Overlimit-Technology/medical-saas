# Ficha por especialidad

Cada profesional ve sus citas del día. Al abrir una, elige una **tarjeta de tipo de atención** de su especialidad, y la ficha se arma con los bloques de ese tipo.

## Flujo

1. **Panel del profesional, "Mi agenda de hoy"**: cada cita muestra el motivo escrito al agendar, si el paciente está en sala y el tipo elegido en recepción. El botón **Atender** abre la ficha.
2. **PIN clínico**: antes de mostrar la ficha se pide el PIN, de 4 a 6 números. La primera vez se crea con la contraseña.
   - Tras 2 minutos sin actividad la ficha se bloquea. Queda borrosa debajo y nada de lo escrito se pierde.
   - Con 5 intentos fallidos en 10 minutos hay que crear un PIN nuevo con la contraseña.
3. **Tarjetas**: se marca como "Sugerida" la más probable.
   - Si recepción eligió un tipo al agendar, gana ese ("Elegida en recepción").
   - Si no, sin atenciones previas se sugiere "primera vez".
   - Si no, se repite el último seguimiento.

   El profesional siempre puede elegir otra. En **Ordenar** puede ocultar, reordenar, duplicar, editar y eliminar tarjetas. **+** crea un tipo propio con nombre, bloques, campos (texto, número, sí/no, lista, lista múltiple, escala y fecha), duración, color y formato de nota. Un administrador puede compartir un tipo con el equipo de la especialidad.
4. **Consentimiento informado**: la primera atención lo pide. Se guarda en `PatientConsent` con su texto, el nombre de quien acepta, quién lo registró y la fecha.
5. **Etapas**:
   - Medicina usa las etapas clásicas: signos vitales, evaluación, diagnóstico y receta.
   - Las demás especialidades siguen estas etapas: **Recepción** (motivo precargado y antecedentes generales), **módulo del tipo**, **nota** (SOAP, DAP, BIRP o texto libre) y **Cierre**.
6. **Valor anterior**: los campos marcados con `carry` muestran "Antes: 6/10" y la diferencia. Los ids de campo son globales (`body.weight`, `pain.eva`), así el control encuentra el dato de la primera consulta.

## Ley 20.584

| Exigencia | Dónde |
|---|---|
| Registro de accesos a la ficha | `ClinicalAccessLog`: OPEN, EDIT (uno cada 5 min por recurso), CLOSE, PIN_OK, PIN_FAIL, PIN_SET, LOCK, con IP y navegador. Lee `ClinicalAccessService.listForPatient`. |
| Datos sensibles cifrados | AES-256-GCM (`src/server/security/fieldCrypto.ts`). Cifra los textos de las secciones, los campos de los tipos, la nota y los antecedentes generales. La exportación FHIR los descifra al salir. |
| Consentimiento guardado | `PatientConsent` (alcances ATTENTION, RECORDING, PHOTOS, AI) |
| Acceso en equipos compartidos | PIN clínico con cookie `mg_clinical` firmada, de 3 minutos y que se renueva con cada acción |

Los datos anteriores sin cifrar se siguen leyendo. Quedan cifrados la próxima vez que se guardan.

## Variables de entorno

- `CLINICAL_DATA_KEY`: 32 bytes en base64. Genérala con `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
  - Va solo en `.env.local` y en las variables del hosting. Nunca va en el repositorio.
  - Si se pierde, los datos cifrados no se recuperan. Respáldala en el gestor de claves del equipo.
  - Producción necesita su propia clave antes de desplegar.

## Base de datos

La migración `prisma/migrations/20261104120000_clinical_specialties` es aditiva: agrega columnas y tablas sin tocar datos. **Aún no se aplica en Neon.**

## Código

- Catálogo de fábrica, formatos de nota y sugerencia: `src/lib/clinical/attentionTypes.ts`
- Tipos propios, orden y ocultas: `src/server/clinical/AttentionTypesService.ts`, `/api/attention-types`
- PIN: `src/server/clinical/clinicalPin.ts`, `/api/clinical/pin`, `src/presentation/clinical/ClinicalLock.tsx`
- Consulta: `ConsultationsService` (bloques con `codeSystem "urn:zensya:block"`, copia del tipo en `ClinicalVisit.attentionSnapshot`)
- Pruebas: `npm run test:clinical`, y de punta a punta `dev-local/probar-ficha-especialidad.ts`

## Pendiente (por especialidad)

Medicina (CIE-10, alertas de interacciones), kinesiología (sala virtual, mapa corporal, ejercicios con video), nutrición (cálculos, pauta con IA, PDF), psicología (grabación con IA, PHQ-9 y GAD-7), matronería (semanas y curva de peso), terapia ocupacional (metas con checklist) y comparador de fotos.
