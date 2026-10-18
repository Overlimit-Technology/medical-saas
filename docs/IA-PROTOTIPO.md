# Prototipo de IA: borrador de evolucion clinica

Primer caso de uso del piloto: el doctor escribe notas sueltas y recibe un borrador estructurado (motivo, anamnesis, examen, diagnostico presuntivo, indicaciones). El doctor revisa y decide. La IA no guarda nada.

## Reglas del piloto

1. Proveedor: Gemini en plan gratuito. Google puede usar el contenido para mejorar sus productos, asi que **solo datos inventados**.
2. Solo se envia el texto de las notas. Nunca nombre, RUN ni otros datos del paciente.
3. Antes de enviar se ocultan RUT, correos y telefonos evidentes. Los nombres propios no se detectan.
4. Para produccion con datos reales hay que cambiar a un plan de pago y pasar revision legal (Ley 21.719).

## Configurar

1. Crear una clave gratuita en Google AI Studio.
2. Agregar al `.env` (nunca al repositorio):

```
GEMINI_API_KEY=tu_clave
# Opcional:
# GEMINI_MODEL=gemini-3.5-flash-lite
# AI_PROVIDER=mock   (fuerza respuestas simuladas)
```

Sin `GEMINI_API_KEY` la pantalla responde en modo simulado y lo indica.

## Uso

Entrar como DOCTOR a `/asistente-ia`, usar "Cargar ejemplo inventado" y "Generar borrador".

## Archivos

| Area | Archivo |
|---|---|
| Seleccion de proveedor | `src/server/ai/index.ts` |
| Adaptador Gemini | `src/server/ai/providers/gemini.ts` |
| Adaptador simulado | `src/server/ai/providers/mock.ts` |
| Limpieza de datos | `src/server/ai/redact.ts` |
| Caso de uso y prompt | `src/server/ai/features/evolutionDraft.ts` |
| API (solo DOCTOR, 8 por minuto) | `src/app/api/ai/evolution-draft/route.ts` |
| Pantalla | `src/presentation/ai/AsistenteIa.tsx` |

## Pendiente

- Probar con clave real de Gemini y afinar el prompt con 30 a 50 notas inventadas.
- Integrar el borrador dentro de la consola de consulta (hoy es una pantalla aparte para no chocar con cambios en curso).
- Enlace en el menu lateral.
- Para produccion: adaptador de Claude (Haiku), tope de gasto y revision legal.
