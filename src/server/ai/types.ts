export type AiJsonRequest = {
  system: string;
  prompt: string;
  /** Baja temperatura para respuestas estables en tareas de redaccion. */
  temperature?: number;
};

export type AiAudioInput = {
  mimeType: string;
  /** Audio codificado en base64, sin prefijo data:. */
  base64: string;
};

export type AiJsonResponse = {
  /** Texto JSON tal como lo devolvio el modelo (sin validar). */
  json: string;
  provider: "gemini" | "mock";
  model: string;
  /** true cuando la respuesta fue simulada porque no hay clave configurada. */
  simulated: boolean;
};

export interface AiProvider {
  generateJson(request: AiJsonRequest): Promise<AiJsonResponse>;
  generateJsonFromAudio(request: AiJsonRequest & { audio: AiAudioInput }): Promise<AiJsonResponse>;
}
