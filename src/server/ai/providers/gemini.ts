import type { AiAudioInput, AiJsonRequest, AiJsonResponse, AiProvider } from "../types";

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 60_000;

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
};

export class GeminiProvider implements AiProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL
  ) {}

  generateJson(request: AiJsonRequest): Promise<AiJsonResponse> {
    return this.call(request, [{ text: request.prompt }]);
  }

  generateJsonFromAudio(request: AiJsonRequest & { audio: AiAudioInput }): Promise<AiJsonResponse> {
    return this.call(request, [
      { text: request.prompt },
      { inlineData: { mimeType: request.audio.mimeType, data: request.audio.base64 } },
    ]);
  }

  private async call(request: AiJsonRequest, parts: GeminiPart[]): Promise<AiJsonResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(`${ENDPOINT}/${this.model}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // La clave va en el header y no en la URL para que no quede en logs.
          "x-goog-api-key": this.apiKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: request.system }] },
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: request.temperature ?? 0.2,
            responseMimeType: "application/json",
          },
        }),
      });

      const data = (await res.json().catch(() => null)) as GeminiResponse | null;

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("Se alcanzo el limite gratuito de Gemini. Intenta en un minuto.");
        }
        throw new Error(`Gemini respondio ${res.status}: ${data?.error?.message ?? "error desconocido"}`);
      }

      if (data?.promptFeedback?.blockReason) {
        throw new Error("Gemini bloqueo la solicitud por sus filtros de seguridad.");
      }

      const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
      if (!text.trim()) {
        throw new Error("Gemini no devolvio contenido.");
      }

      return { json: text, provider: "gemini", model: this.model, simulated: false };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Gemini tardo demasiado en responder.");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
