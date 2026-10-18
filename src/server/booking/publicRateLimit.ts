// Limite en memoria por IP y tipo de accion. Sirve para frenar abuso basico en un solo servidor.
// En produccion con varias instancias conviene un almacen compartido (por ejemplo Redis).
const buckets = new Map<string, number[]>();

const LIMITS = {
  read: { windowMs: 60_000, max: 60 },
  book: { windowMs: 10 * 60_000, max: 5 },
  assistant: { windowMs: 60_000, max: 8 },
} as const;

export type PublicAction = keyof typeof LIMITS;

export function clientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export function isPublicRateLimited(req: Request, action: PublicAction) {
  const { windowMs, max } = LIMITS[action];
  const key = `${action}:${clientIp(req)}`;
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((time) => now - time < windowMs);

  if (recent.length >= max) {
    buckets.set(key, recent);
    return true;
  }

  recent.push(now);
  buckets.set(key, recent);

  // Evita que el mapa crezca sin limite.
  if (buckets.size > 5000) {
    buckets.forEach((times, bucketKey) => {
      if (times.every((time) => now - time > 10 * 60_000)) buckets.delete(bucketKey);
    });
  }

  return false;
}
