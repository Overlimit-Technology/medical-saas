import { GeminiProvider } from "./providers/gemini";
import { MockProvider } from "./providers/mock";
import type { AiProvider } from "./types";

/**
 * Elige el proveedor por entorno.
 * - AI_PROVIDER=mock fuerza la simulacion.
 * - Sin AI_PROVIDER, usa Gemini si hay GEMINI_API_KEY y simula si no la hay.
 * Para cambiar de proveedor en produccion solo se agrega otro adaptador aqui.
 */
export function getAiProvider(): AiProvider {
  const choice = process.env.AI_PROVIDER?.trim().toLowerCase();
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (choice === "mock" || (!choice && !apiKey)) {
    return new MockProvider();
  }

  if (!apiKey) {
    throw new Error("Falta GEMINI_API_KEY en el entorno.");
  }

  return new GeminiProvider(apiKey);
}

export type { AiProvider, AiJsonRequest, AiJsonResponse } from "./types";
