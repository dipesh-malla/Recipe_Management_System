import { Router } from "express";

export function homeRouter({ redisClient, javaBaseUrl }: { redisClient: any; javaBaseUrl: string }) {
  const router = Router();

  // Fetch with timeout helper to avoid long blocking requests
  const fetchWithTimeout = async (url: string, timeoutMs = 2500) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(url, { signal: controller.signal });
      return resp;
    } finally {
      clearTimeout(id);
    }
  };

  // Helper to proxy + cache
  const cacheGet = async (key: string) => {
    try {
      if (!redisClient) return null;
      const v = await redisClient.get(key);
      return v ? JSON.parse(v) : null;
    } catch (e) {
      return null;
    }
  };

  const cacheSet = async (key: string, value: any, ttlSec = 60) => {
    try {
      if (!redisClient) return;
      await redisClient.set(key, JSON.stringify(value), { EX: ttlSec });
    } catch (e) {
      // ignore cache errors
    }
  };

  const cacheDelete = async (key: string) => {
    try {
      if (!redisClient) return;
      await redisClient.del(key);
    } catch (e) {
      // ignore
    }
  };

  router.get("/featured", async (_req, res) => {
    const cacheKey = "home:featured";
    try {
      const cached = await cacheGet(cacheKey);
      if (cached) return res.json(cached);

      // Try a fast proxy fetch with a short timeout; fall back to empty if it times out
      // Request the top recipes by like count (most liked = trending)
      const resp = await fetchWithTimeout(`${javaBaseUrl}/v1/recipes/allRecipe?page=0&size=6&sortBy=likeCount&sortOrder=DESC`, 2000);
      const data = resp && resp.ok ? await resp.json().catch(() => null) : null;
      const safe = data ?? { data: { content: [] } };

      // Normalize content array
      const content = safe?.data?.content ?? safe?.data ?? safe?.content ?? [];
      const arr = Array.isArray(content) ? content : [];

      // Sort by likes/reactions if present (descending) so Trending shows most-liked recipes first
      arr.sort((a: any, b: any) => {
        const aLikes = Number(a.reactionsCount ?? a.reactions ?? a.likes ?? a.likeCount ?? 0) || 0;
        const bLikes = Number(b.reactionsCount ?? b.reactions ?? b.likes ?? b.likeCount ?? 0) || 0;
        return bLikes - aLikes;
      });

      // Attach sorted content back to safe to cache/return
      if (safe?.data && typeof safe.data === 'object') {
        safe.data.content = arr;
      } else if (safe && typeof safe === 'object') {
        safe.content = arr;
      }
      await cacheSet(cacheKey, safe, 60); // short TTL for fresh content
      return res.json(safe);
    } catch (err) {
      console.error("home:featured proxy error", err);
      // Return a safe, empty payload so the homepage can render quickly
      const safe = { data: { content: [] } };
      await cacheSet(cacheKey, safe, 10); // cache the failure briefly
      return res.json(safe);
    }
  });

  router.get("/chefs", async (_req, res) => {
    const cacheKey = "home:chefs";
    try {
      const cached = await cacheGet(cacheKey);
      if (cached) return res.json(cached);

      // Request top chefs ordered by follower count (desc). The Java backend
      // supports /v1/users/chefs with sortBy=followers to return chefs with
      // recipeCount>0 and server-side follower sorting.
      const resp = await fetchWithTimeout(`${javaBaseUrl}/v1/users/chefs?page=0&size=4&sortBy=followers&sortOrder=DESC`, 2000);
      const data = resp && resp.ok ? await resp.json().catch(() => null) : null;

      // The Java controller may wrap results in multiple nested `data` fields.
      // Normalize these known shapes into a flat array:
      // - raw array
      // - { data: { data: [...] } }
      // - { data: [...] }
      // - { data: { content: [...] } }
      let safe: any[] = [];
      if (Array.isArray(data)) {
        safe = data;
      } else if (Array.isArray(data?.data?.data)) {
        safe = data.data.data;
      } else if (Array.isArray(data?.data)) {
        safe = data.data;
      } else if (Array.isArray(data?.data?.content)) {
        safe = data.data.content;
      } else if (Array.isArray(data?.content)) {
        safe = data.content;
      } else {
        safe = [];
      }

      // As an extra safety, ensure array is sorted by stats.followersCount desc
      // in case the backend returned unsorted results or the proxy received a
      // different shape.
      safe = Array.isArray(safe) ? safe : [];
      safe.sort((a: any, b: any) => {
        const aF = Number(a?.stats?.followersCount ?? a?.followers ?? a?.stats?.followers ?? 0) || 0;
        const bF = Number(b?.stats?.followersCount ?? b?.followers ?? b?.stats?.followers ?? 0) || 0;
        return bF - aF;
      });

      await cacheSet(cacheKey, safe, 300); // cache for 5 minutes
      return res.json(safe);
    } catch (err) {
      console.error("home:chefs proxy error", err);
      const safe: any[] = [];
      await cacheSet(cacheKey, safe, 10);
      return res.json(safe);
    }
  });

  // Invalidate cached home chefs (used after follow/unfollow to keep lists fresh)
  router.post("/invalidate/chefs", async (_req, res) => {
    try {
      const cacheKey = "home:chefs";
      await cacheDelete(cacheKey);
      return res.json({ success: true });
    } catch (err) {
      console.error("home:invalidate/chefs error", err);
      return res.status(500).json({ success: false });
    }
  });

  router.get("/stats", async (_req, res) => {
    const cacheKey = "home:stats";
    try {
      const cached = await cacheGet(cacheKey);
      if (cached) return res.json(cached);

      // derive stats: total recipes, total users, community size
      // Fetch all three stats in parallel with short timeouts to avoid serial blocking
      const [recipesResp, usersResp, communityResp] = await Promise.allSettled([
        fetchWithTimeout(`${javaBaseUrl}/v1/recipes/allRecipe?page=0&size=1`, 1500),
        fetchWithTimeout(`${javaBaseUrl}/v1/users?page=0&size=1`, 1500),
        fetchWithTimeout(`${javaBaseUrl}/v1/user-stats/allUserStats`, 1500),
      ]);

      const recipesData = recipesResp.status === 'fulfilled' && recipesResp.value ? await recipesResp.value.json().catch(() => null) : null;
      const usersData = usersResp.status === 'fulfilled' && usersResp.value ? await usersResp.value.json().catch(() => null) : null;
      const communityData = communityResp.status === 'fulfilled' && communityResp.value ? await communityResp.value.json().catch(() => null) : null;

      const totalRecipes = recipesData?.data?.totalElements ?? recipesData?.totalElements ?? (Array.isArray(recipesData?.data) ? recipesData.data.length : 0);
      const totalUsers = usersData?.data?.totalElements ?? usersData?.totalElements ?? 0;
      const totalCommunity = communityData?.data?.totalElements ?? (Array.isArray(communityData?.data) ? communityData.data.length : 0);

      const out = { totalRecipes, totalUsers, totalCommunity };
      await cacheSet(cacheKey, out, 600);
      return res.json(out);
    } catch (err) {
      console.warn("home:stats proxy error", err);
      return res.status(500).json({ error: "failed" });
    }
  });

  return router;
}
