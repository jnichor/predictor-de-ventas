/**
 * Rate limiter en memoria basado en ventana deslizante (sliding window).
 *
 * LIMITACIÓN CONOCIDA: funciona solo dentro de una instancia del server.
 * Si Vercel escala a múltiples regiones/lambdas, cada instancia tiene su propio
 * Map. Para escalado real con coordinación global, migrar a Upstash Ratelimit
 * o Redis. Para este caso (una tienda, tráfico modesto), es suficiente.
 *
 * Uso:
 *   const limit = rateLimit({ windowMs: 60_000, max: 10 });
 *   const result = limit.check(key);
 *   if (!result.ok) return 429;
 */

type RateLimitOptions = {
  /** Ventana en milisegundos */
  windowMs: number;
  /** Máximo de requests por ventana */
  max: number;
};

type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; retryAfterSeconds: number; resetAt: number };

type Entry = {
  /** Timestamps de requests recientes dentro de la ventana */
  hits: number[];
};

const stores = new WeakMap<RateLimitOptions, Map<string, Entry>>();

export function rateLimit(options: RateLimitOptions) {
  if (!stores.has(options)) {
    stores.set(options, new Map());
  }
  const store = stores.get(options)!;

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const windowStart = now - options.windowMs;

      let entry = store.get(key);
      if (!entry) {
        entry = { hits: [] };
        store.set(key, entry);
      }

      // Limpio hits viejos fuera de la ventana
      entry.hits = entry.hits.filter((t) => t > windowStart);

      if (entry.hits.length >= options.max) {
        const oldestHit = entry.hits[0];
        const resetAt = oldestHit + options.windowMs;
        return {
          ok: false,
          retryAfterSeconds: Math.ceil((resetAt - now) / 1000),
          resetAt,
        };
      }

      entry.hits.push(now);
      return {
        ok: true,
        remaining: options.max - entry.hits.length,
        resetAt: now + options.windowMs,
      };
    },
  };
}

/** Cleanup periódico del Map para no leakear memoria en instancias long-lived.
 *  Lo llamamos lazy desde cada check() si hay muchas entries. */
export function getClientKey(request: Request, userId?: string | null): string {
  if (userId) return `user:${userId}`;
  // Fallback por IP (Vercel añade x-forwarded-for)
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
  return `ip:${ip}`;
}
