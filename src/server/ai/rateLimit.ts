// Limite simple por usuario para proteger la cuota gratuita (no es un limite distribuido).
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const hits = new Map<string, number[]>();

export function isAiRateLimited(userId: string) {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(userId, recent);
    return true;
  }
  recent.push(now);
  hits.set(userId, recent);
  return false;
}
