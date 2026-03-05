export type RateLimitCheckResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAtEpochSeconds: number;
  retryAfterSeconds: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

// Ventana fija de 1 minuto para throttling basico.
const WINDOW_MS = 60 * 1000;
// Buckets en memoria por key de cliente/actor.
const buckets = new Map<string, Bucket>();
let gcTick = 0;

// Limpia buckets vencidos cada N requests para mantener el mapa acotado.
function cleanupExpiredBuckets(now: number) {
  gcTick += 1;
  if (gcTick % 50 !== 0) return;

  for (const [key, bucket] of Array.from(buckets.entries())) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

// Evalua una request contra el limite por minuto y devuelve estado del bucket.
export function checkRateLimit(key: string, limitPerMinute: number): RateLimitCheckResult {
  const safeLimit = Math.max(1, Math.floor(limitPerMinute));
  const now = Date.now();
  cleanupExpiredBuckets(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + WINDOW_MS;
    buckets.set(key, {
      count: 1,
      resetAt,
    });
    return {
      allowed: true,
      limit: safeLimit,
      remaining: Math.max(0, safeLimit - 1),
      resetAtEpochSeconds: Math.ceil(resetAt / 1000),
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= safeLimit) {
    return {
      allowed: false,
      limit: safeLimit,
      remaining: 0,
      resetAtEpochSeconds: Math.ceil(existing.resetAt / 1000),
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  buckets.set(key, existing);
  return {
    allowed: true,
    limit: safeLimit,
    remaining: Math.max(0, safeLimit - existing.count),
    resetAtEpochSeconds: Math.ceil(existing.resetAt / 1000),
    retryAfterSeconds: 0,
  };
}

// Convierte el resultado de throttling a headers HTTP estandar operativos.
export function toRateLimitHeaders(result: RateLimitCheckResult) {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetAtEpochSeconds),
    ...(result.allowed
      ? {}
      : {
          "Retry-After": String(result.retryAfterSeconds),
        }),
  };
}
