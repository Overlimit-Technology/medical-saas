import { getAiProvider } from "../index";
import { redactSensitive } from "../redact";
import { DRAFT_RULES, parseDraft, type EvolutionDraftResult } from "./evolutionDraft";

export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

const ALLOWED_AUDIO_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/aac",
  "audio/flac",
  // Chrome puede etiquetar una grabacion solo de audio como video/webm.
  "video/webm",
];

const SYSTEM_PROMPT = `Eres un asistente de redaccion para profesionales de la salud en Chile.
Recibes la grabacion de voz de un profesional que dicta su consulta. Primero transcribes y luego redactas un BORRADOR de evolucion clinica en espanol neutro y tecnico.
Reglas:
${DRAFT_RULES}
- En la transcripcion, reemplaza cualquier nombre de persona por [NOMBRE] y cualquier RUT, telefono o correo dictado por [DATO]. Haz lo mismo en el borrador.
- Si el audio no tiene voz clara o no es una consulta, devuelve todos los campos vacios y una transcripcion vacia.
- Responde solo con JSON con estas claves: transcripcion, motivoConsulta, anamnesis, examenClinico, diagnosticoPresuntivo, indicaciones, camposFaltantes (arreglo de nombres de clave).`;

export function normalizeAudioMimeType(mimeType: string) {
  return mimeType.split(";")[0].trim().toLowerCase();
}

export function isAllowedAudioType(mimeType: string) {
  return ALLOWED_AUDIO_TYPES.includes(normalizeAudioMimeType(mimeType));
}

export async function generateVoiceDraft(input: {
  mimeType: string;
  base64: string;
}): Promise<EvolutionDraftResult> {
  const response = await getAiProvider().generateJsonFromAudio({
    system: SYSTEM_PROMPT,
    prompt: "Transcribe esta grabacion y redacta el borrador de evolucion.",
    temperature: 0.2,
    audio: { mimeType: normalizeAudioMimeType(input.mimeType), base64: input.base64 },
  });

  const { draft, transcript } = parseDraft(response.json);

  // Segunda red de seguridad: el modelo ya reemplaza nombres, aqui se limpian identificadores sueltos.
  const cleanTranscript = redactSensitive(transcript);

  return {
    draft,
    transcript: cleanTranscript.text,
    meta: {
      provider: response.provider,
      model: response.model,
      simulated: response.simulated,
      redactions: cleanTranscript.redactions,
    },
  };
}
