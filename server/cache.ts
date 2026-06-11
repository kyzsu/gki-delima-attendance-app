// Tiny in-memory TTL cache. On Vercel each warm serverless instance keeps
// its own copy, so writes from another instance can't be invalidated here —
// keep TTLs short enough that cross-instance staleness is harmless.

const store = new Map<string, { value: unknown; expires: number }>();

export function cacheGet<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return hit.value as T;
}

export function cacheSet(key: string, value: unknown, ttlMs: number) {
  store.set(key, { value, expires: Date.now() + ttlMs });
}

export function cacheDelete(key: string) {
  store.delete(key);
}
