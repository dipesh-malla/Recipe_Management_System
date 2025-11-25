type CacheEntry<T> = { value: T; expiresAt: number };

const cache = new Map<string, CacheEntry<any>>();

export const setCache = <T>(key: string, value: T, ttlSec = 60) => {
  const expiresAt = Date.now() + ttlSec * 1000;
  cache.set(key, { value, expiresAt });
};

export const getCache = <T>(key: string): T | null => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
};

export const invalidateCacheKey = (key: string) => cache.delete(key);

export const clearCache = () => cache.clear();

// Helper to build consistent keys for paginated users
export const buildUsersKey = (page: number, size: number, sort: string, search = "") => {
  const s = search ? `&q=${encodeURIComponent(search)}` : "";
  return `users?page=${page}&size=${size}&sort=${sort}${s}`;
};

// Invalidate any cache entries that include a particular user id in their stored pages
export const invalidateCacheForUser = (userId: number) => {
  for (const [key, entry] of cache.entries()) {
    try {
      const v = entry.value as any;
      if (Array.isArray(v?.data)) {
        if (v.data.some((u: any) => u.id === userId)) cache.delete(key);
      } else if (Array.isArray(v)) {
        if (v.some((u: any) => u.id === userId)) cache.delete(key);
      } else if (v?.content && Array.isArray(v.content)) {
        if (v.content.some((u: any) => u.id === userId)) cache.delete(key);
      }
    } catch (e) {
      // ignore
    }
  }
};
