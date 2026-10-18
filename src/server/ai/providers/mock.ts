import type { AiAudioInput, AiJsonRequest, AiJsonResponse, AiProvider } from "../types";

/**
 * Proveedor simulado para desarrollar sin clave. No interpreta el texto ni el audio:
 * devuelve un borrador de ejemplo para probar la pantalla y la validacion.
 */
export class MockProvider implements AiProvider {
  async generateJson(request: AiJsonRequest): Promise<AiJsonResponse> {
    void request;
    return this.sample("");
  }

  async generateJsonFromAudio(request: AiJsonRequest & { audio: AiAudioInput }): Promise<AiJsonResponse> {
    void request;
    return this.sample("Transcripcion simulada: configura GEMINI_API_KEY para transcribir de verdad.");
  }

  private sample(transcripcion: string): AiJsonResponse {
    const json = JSON.stringify({
      transcripcion,
      motivoConsulta: "Respuesta simulada: configura GEMINI_API_KEY para usar el modelo real.",
      anamnesis: "Texto de ejemplo generado sin modelo.",
      examenClinico: "",
      diagnosticoPresuntivo: "",
      indicaciones: "",
      camposFaltantes: ["examenClinico", "diagnosticoPresuntivo", "indicaciones"],
    });
    return { json, provider: "mock", model: "mock", simulated: true };
  }
}
