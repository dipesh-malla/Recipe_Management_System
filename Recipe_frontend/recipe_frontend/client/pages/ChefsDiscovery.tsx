import MainLayout from "@/components/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Users,
  ChefHat,
  Star,
  TrendingUp,
  UserPlus,
  UserCheck,
  Sparkles
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  followUser,
  unfollowUser,
  getCurrentUser,
  getAllUsers,
  getChefs,
  getTrendingChefs,
  isFollowing,
  getFollowing,
  isJavaBackendAvailable,
  getUserRecipes,
  getSimilarUsersPost,
  getUserById,
  getUserStatByUserId,
} from "@/lib/api";
import { getCache, setCache, buildUsersKey, invalidateCacheForUser } from "@/lib/cache";

interface UserProfile {
  id: number;
  displayName: string;
  username: string;
  email?: string;
  bio?: string;
  profileUrl?: string;
  stats?: {
    recipeCount: number;
    followersCount: number;
    followingCount: number;
  };
  recipesCount?: number;
  followersCount?: number;
  followingCount?: number;
  expertise?: string[];
  isFollowing?: boolean;
}

export default function ChefsDiscovery() {
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [recommendedChefs, setRecommendedChefs] = useState<UserProfile[]>([]);
  const [trendingChefs, setTrendingChefs] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSort = (searchParams.get("sort") as "recipes" | "followers" | "newest") || "recipes";
  const [sortBy, setSortBy] = useState<"recipes" | "followers" | "newest">(initialSort);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialPage = Number(searchParams.get("page") ?? 0);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const currentUser = getCurrentUser();
  const pageSize = 10;
  const SEARCH_PAGE_SIZE = 16;
  const isSearching = Boolean(searchQuery);

  const formatUser = (user: any): UserProfile => {
    const stats = user.stats || user.profileStats || {};
    const followers = user.followersCount ?? user.followers ?? stats.followersCount ?? stats.followers ?? user.followers_count ?? 0;
    const recipes = user.recipeCount ?? user.recipes ?? stats.recipeCount ?? stats.recipes ?? user.recipe_count ?? 0;
    const displayName = user.displayName || user.name || user.username || `User ${user.id}`;
    const username = user.username || (`user${user.id}`);
    const profileUrl = user.profileUrl || user.profile?.url || user.avatar || `https://i.pravatar.cc/150?u=${username}`;

    return {
      id: user.id,
      displayName,
      username,
      email: user.email,
      bio: user.bio || user.description || "Passionate about creating delicious recipes",
      profileUrl,
      stats,
      recipesCount: Number(recipes) || 0,
      followersCount: Number(followers) || 0,
      followingCount: Number(user.followingCount ?? stats.followingCount ?? user.following ?? 0) || 0,
      expertise: user.expertise || user.skills || [],
      isFollowing: Boolean(user.isFollowing),
    };
  };

  // Fetch real users from database with pagination
  const fetchAllUsers = async (page = 0, size = pageSize) => {
    try {
      setIsLoading(true);
      const cacheKey = buildUsersKey(page, size, sortBy, searchQuery);
      const cached = getCache<any>(cacheKey);
      if (cached) {
        console.log(`[cache] hit ${cacheKey}`);
        // reuse cached payload shape
        const data = cached;
        // When cache stores raw array or paginated response, normalize similar to live fetch
        const paginatedData = data?.data ?? data;
        let users = Array.isArray(paginatedData.data) ? paginatedData.data :
                     Array.isArray(paginatedData.content) ? paginatedData.content :
                     Array.isArray(paginatedData) ? paginatedData : [];
        // If pagination metadata present in cached response, restore it
        if (paginatedData.totalPages !== undefined) {
          setTotalPages(paginatedData.totalPages);
          setTotalUsers(paginatedData.totalElements || 0);
          setCurrentPage(paginatedData.currentPage || page);
        }
        if (currentUser?.id) users = users.filter((u: any) => u.id !== currentUser.id);
        let formattedUsers = users.map(formatUser);
        // Enrich cached users with server-side stats (so sorting by recipes/followers works)
        try {
          const statsPromises = formattedUsers.map(async (u) => {
            try {
              const statResp = await getUserStatByUserId(u.id);
              if (statResp?.success && statResp.data) {
                const s = statResp.data;
                return { id: u.id, stats: s, recipeCount: s.recipeCount ?? s.recipes ?? s.recipe_count ?? 0, followersCount: s.followersCount ?? s.followers ?? 0 };
              }
              return { id: u.id };
            } catch (e) {
              return { id: u.id };
            }
          });

          const statsResults = await Promise.all(statsPromises);
          const statsMap = statsResults.reduce((acc: any, cur: any) => { acc[cur.id] = cur; return acc; }, {});

          formattedUsers = formattedUsers.map(u => {
            const s = statsMap[u.id];
            if (s) {
              return {
                ...u,
                stats: s.stats || u.stats,
                recipesCount: Number(s.recipeCount ?? u.recipesCount ?? 0) || 0,
                followersCount: Number(s.followersCount ?? u.followersCount ?? 0) || 0,
              };
            }
            return u;
          });
        } catch (e) {
          console.warn('Failed to enrich cached users with stats:', e);
        }

        formattedUsers = sortUsers(formattedUsers, sortBy);
        setAllUsers(formattedUsers);
        setFilteredUsers(sortUsers(formattedUsers, sortBy));
        // Fetch global trending chefs from server (non-blocking) with client cache
        (async () => {
          try {
            const tKey = `trending:6`;
            const cachedT = getCache<any>(tKey);
            if (cachedT) {
              const raw = cachedT.data ?? cachedT;
              const trendingFormatted = (Array.isArray(raw) ? raw : raw?.content ?? raw?.data ?? [])
                .map(formatUser)
                .slice(0, 6);
              setTrendingChefs(trendingFormatted);
            } else {
              const tresp = await getTrendingChefs(6);
              if (tresp?.success && tresp.data) {
                setCache(tKey, tresp, 300);
                const raw = tresp.data;
                const trendingFormatted = (Array.isArray(raw) ? raw : raw?.content ?? raw?.data ?? [])
                  .map(formatUser)
                  .slice(0, 6);
                setTrendingChefs(trendingFormatted);
              }
            }
          } catch (e) {
            // fallback to local page-based trending
            setTrendingChefs([...formattedUsers].slice(0, 6));
          }
        })();
        setIsLoading(false);
        // prefetch next page in background
        (async () => {
          const nextKey = buildUsersKey(page + 1, size, sortBy, searchQuery);
          if (!getCache(nextKey)) {
            try {
              const resp = await getAllUsers(page + 1, size);
              setCache(nextKey, resp, 60);
            } catch (e) {}
          }
        })();
        return;
      }

      console.log(`[cache] miss ${cacheKey} — fetching`);
      // Use server-side chefs endpoint for search + sorting so results are globally consistent
      const response = await getChefs(page, size, searchQuery || undefined, sortBy, "DESC");
      console.log("getAllUsers response:", response);
      
      if (!response.success || !response.data) {
        console.error("Invalid response:", response);
        throw new Error("Failed to fetch users");
      }

      // Handle paginated response
      const paginatedData = response.data;
      let users = Array.isArray(paginatedData.data) ? paginatedData.data : 
                   Array.isArray(paginatedData.content) ? paginatedData.content :
                   Array.isArray(paginatedData) ? paginatedData : [];
      
      console.log(`Fetched ${users.length} users from database (page ${page})`);
      
      // Update pagination info
      if (paginatedData.totalPages !== undefined) {
        setTotalPages(paginatedData.totalPages);
        setTotalUsers(paginatedData.totalElements || 0);
        setCurrentPage(paginatedData.currentPage || page);
      }
      
      // Filter out current user
      if (currentUser?.id) {
        users = users.filter((u: any) => u.id !== currentUser.id);
        console.log(`After filtering current user: ${users.length} users`);
      }

      // Format users immediately without follow status for instant display
      let formattedUsers = users.map(formatUser);

      // Enrich each user with server-side stats (if available) to get accurate recipe counts
      try {
        const statsPromises = formattedUsers.map(async (u) => {
          try {
            const statResp = await getUserStatByUserId(u.id);
            if (statResp?.success && statResp.data) {
              const s = statResp.data;
              return { id: u.id, stats: s, recipeCount: s.recipeCount ?? s.recipes ?? s.recipe_count ?? 0, followersCount: s.followersCount ?? s.followers ?? 0 };
            }
            return { id: u.id };
          } catch (e) {
            return { id: u.id };
          }
        });

        const statsResults = await Promise.all(statsPromises);
        const statsMap = statsResults.reduce((acc: any, cur: any) => { acc[cur.id] = cur; return acc; }, {});

        formattedUsers = formattedUsers.map(u => {
          const s = statsMap[u.id];
          if (s) {
            return {
              ...u,
              stats: s.stats || u.stats,
              recipesCount: Number(s.recipeCount ?? u.recipesCount ?? 0) || 0,
              followersCount: Number(s.followersCount ?? u.followersCount ?? 0) || 0,
            };
          }
          return u;
        });
      } catch (e) {
        console.warn('Failed to enrich users with stats:', e);
      }

      // Sort according to current sortBy (default: recipes)
      formattedUsers = sortUsers(formattedUsers, sortBy);

      // If a user is logged in, remove users they already follow so they don't appear in discovery
      if (currentUser?.id) {
        try {
          const followingResp = await getFollowing(currentUser.id);
          let followingIds: number[] = [];
          if (followingResp) {
            // support shapes: { success:true, data:[{id,...}] } or plain array
            if (Array.isArray(followingResp)) {
              followingIds = followingResp.map((f: any) => f.id).filter(Boolean);
            } else if (followingResp.data && Array.isArray(followingResp.data)) {
              followingIds = followingResp.data.map((f: any) => f.id).filter(Boolean);
            } else if (followingResp.success && followingResp.data && Array.isArray(followingResp.data)) {
              followingIds = followingResp.data.map((f: any) => f.id).filter(Boolean);
            }
          }
          const followSet = new Set<number>(followingIds);
          if (followSet.size > 0) {
            formattedUsers = formattedUsers.filter(u => !followSet.has(u.id));
          }
        } catch (e) {
          // ignore follow fetch errors — we'll still show users but background job may later remove them
        }
      }

      setAllUsers(formattedUsers);
      setFilteredUsers(sortUsers(formattedUsers, sortBy));
      // cache raw response for faster next loads (cache the original response object)
      try {
        setCache(cacheKey, response, 60);
      } catch (e) {
        // ignore cache errors
      }
      console.log(`Loaded ${formattedUsers.length} users (page ${page})`);
      
      // Fetch global trending chefs from server (non-blocking)
      (async () => {
        try {
          const tKey = `trending:6`;
          const cachedT = getCache<any>(tKey);
          if (cachedT) {
            const raw = cachedT.data ?? cachedT;
            const trendingFormatted = (Array.isArray(raw) ? raw : raw?.content ?? raw?.data ?? [])
              .map(formatUser)
              .slice(0, 6);
            setTrendingChefs(trendingFormatted);
          } else {
            const tresp = await getTrendingChefs(6);
            if (tresp?.success && tresp.data) {
              setCache(tKey, tresp, 300);
              const raw = tresp.data;
              const trendingFormatted = (Array.isArray(raw) ? raw : raw?.content ?? raw?.data ?? [])
                .map(formatUser)
                .slice(0, 6);
              setTrendingChefs(trendingFormatted);
            } else {
              setTrendingChefs([...formattedUsers].sort((a, b) => (b.recipesCount || 0) - (a.recipesCount || 0)).slice(0, 6));
            }
          }
        } catch (e) {
          setTrendingChefs([...formattedUsers].sort((a, b) => (b.recipesCount || 0) - (a.recipesCount || 0)).slice(0, 6));
        }
      })();

      // Fetch follow status in background (non-blocking)
      if (currentUser?.id) {
        // Fetch follow status in background but don't block rendering
        fetchFollowStatusInBackground(formattedUsers);
      }

    } catch (err: any) {
      console.error("Failed to fetch users:", err);
      setError("Failed to load chefs. Please try again later.");
    }
  };

  // Background task to fetch follow status without blocking UI
  const fetchFollowStatusInBackground = async (users: UserProfile[]) => {
    try {
      // Batch check follow status (limit to first 50 for performance)
      const usersToCheck = users.slice(0, 50);
      const followStatusPromises = usersToCheck.map(async (user) => {
        try {
          const followResponse = await isFollowing(currentUser!.id, user.id);
          // followResponse may be {success:true,data:true} or boolean
          const isF = (followResponse && typeof followResponse === 'object') ? (followResponse.data === true || followResponse === true) : Boolean(followResponse);
          return { userId: user.id, isFollowing: Boolean(isF) };
        } catch (err) {
          return { userId: user.id, isFollowing: false };
        }
      });

      const followStatuses = await Promise.all(followStatusPromises);

      // Map for quick lookup
      const followMap = followStatuses.reduce((acc, cur) => { acc[cur.userId] = cur.isFollowing; return acc; }, {} as Record<number, boolean>);

      // Remove any users that are already followed from the discovery lists
      const followedIds = new Set<number>(followStatuses.filter(f => f.isFollowing).map(f => f.userId));
      if (followedIds.size > 0) {
        const removeFollowed = (list: UserProfile[]) => list.filter(u => !followedIds.has(u.id));
        setAllUsers(prev => removeFollowed(prev));
        setFilteredUsers(prev => removeFollowed(prev));
        setRecommendedChefs(prev => removeFollowed(prev));
        setTrendingChefs(prev => removeFollowed(prev));
      } else {
        const updateUsers = (userList: UserProfile[]) =>
          userList.map(user => ({ ...user, isFollowing: !!followMap[user.id] }));

        setAllUsers(prev => updateUsers(prev));
        setFilteredUsers(prev => updateUsers(prev));
        setRecommendedChefs(prev => updateUsers(prev));
        setTrendingChefs(prev => updateUsers(prev));
      }
    } catch (err) {
      console.error("Failed to fetch follow statuses:", err);
      // Silently fail - users already displayed without follow status
    }
  };

  const sortUsers = (users: UserProfile[], sort: "recipes" | "followers" | "newest") => {
    const copy = [...users];
    if (sort === "recipes") return copy.sort((a, b) => (b.recipesCount || 0) - (a.recipesCount || 0));
    if (sort === "followers") return copy.sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0));
    // newest: assume higher id = newer
    return copy.sort((a, b) => (b.id || 0) - (a.id || 0));
  };

  const fetchRecommendedChefs = async () => {
    try {
      if (!currentUser?.id) {
        // If no user is logged in, fallback to top chefs by followers
        const top6 = [...allUsers]
          .sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0))
          .slice(0, 6);
        setRecommendedChefs(top6);
        return;
      }

      // Get ML-powered recommendations from backend
      console.log("Fetching ML-powered user recommendations for user:", currentUser.id);
      const response = await getSimilarUsersPost(currentUser.id, 6);
      
      if (response && response.similar_users && response.similar_users.length > 0) {
        console.log("Received ML recommendations:", response);
        
        // Map similar_users to our user format by fetching each user by ID
        const recommendedUserIds = response.similar_users.map((su: any) => su.user_id);
        console.log("Fetching user details for IDs:", recommendedUserIds);
        
        // Fetch all recommended users and their stats in parallel
        // If Java backend is down, fall back to resolving recommended IDs from already-loaded `allUsers`.
        const javaUp = isJavaBackendAvailable();
        const userAndStatsPromises = recommendedUserIds.map(async (userId: number) => {
          try {
            if (!javaUp) {
              // Try to find user details in the already-fetched `allUsers` array
              const local = allUsers.find(u => u.id === userId);
              if (local) return local;
              // If not present locally, skip instead of throwing
              return null;
            }

            const [userRes, statsRes] = await Promise.all([
              getUserById(userId),
              getUserStatByUserId(userId)
            ]);

            if (userRes?.success && userRes.data) {
              const userData = userRes.data;
              userData.stats = statsRes?.success ? statsRes.data : {};
              return userData;
            }
            return null;
          } catch (err) {
            console.warn(`Failed to fetch user ${userId}:`, err);
            // Don't fail the whole batch if an individual fetch fails
            return null;
          }
        });

        const userResponses = await Promise.all(userAndStatsPromises);
        
        // Filter out null values and format users
        let mlRecommendedChefs = userResponses
          .filter((user: any) => user !== null)
          .map(formatUser);

        if (mlRecommendedChefs.length > 0) {
          // Order ML recommendations by recipe count (most recipes first)
          mlRecommendedChefs = mlRecommendedChefs.sort((a, b) => (b.recipesCount || 0) - (a.recipesCount || 0));
          console.log(`Successfully fetched ${mlRecommendedChefs.length} ML-powered recommendations with stats`);
          // Remove any users the current user already follows
          if (currentUser?.id) {
            try {
              const followingResp = await getFollowing(currentUser.id);
              let followingIds: number[] = [];
              if (followingResp) {
                if (Array.isArray(followingResp)) {
                  followingIds = followingResp.map((f: any) => f.id).filter(Boolean);
                } else if (followingResp.data && Array.isArray(followingResp.data)) {
                  followingIds = followingResp.data.map((f: any) => f.id).filter(Boolean);
                }
              }
              const followSet = new Set<number>(followingIds);
              if (followSet.size > 0) {
                mlRecommendedChefs = mlRecommendedChefs.filter(u => !followSet.has(u.id));
              }
            } catch (e) {
              // ignore
            }
          }
          setRecommendedChefs(mlRecommendedChefs);
          return;
        } else {
          console.log("No ML recommendations could be fetched, falling back to popularity-based");
        }
      }
      
      // Fallback to popularity-based recommendations if ML fails
      console.log("ML recommendations failed or empty, falling back to popularity-based");
      const top6 = [...allUsers]
        .sort((a, b) => (b.recipesCount || 0) - (a.recipesCount || 0))
        .slice(0, 6);
      setRecommendedChefs(top6);
      
    } catch (error) {
      console.error("Failed to fetch ML recommendations:", error);
      // Fallback to popularity-based recommendations
      const top6 = [...allUsers]
        .sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0))
        .slice(0, 6);
      setRecommendedChefs(top6);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchAllUsers(currentPage, isSearching ? SEARCH_PAGE_SIZE : pageSize);
      setIsLoading(false);
    };
    loadData();
  }, [currentPage]);

  // keep the URL in sync with currentPage so external links can deep-link
  useEffect(() => {
    const pageParam = Number(searchParams.get("page") ?? 0);
    if (pageParam !== currentPage) {
      // update the URL without losing other params
      const newParams = new URLSearchParams(searchParams as any);
      newParams.set("page", String(currentPage));
      newParams.set("sort", sortBy);
      setSearchParams(newParams, { replace: true });
    }
  }, [currentPage]);

  // persist sort in URL whenever it changes
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams as any);
    newParams.set("sort", sortBy);
    newParams.set("page", String(0));
    setSearchParams(newParams, { replace: true });
    // when sort changes, reset to first page and re-fetch
    setCurrentPage(0);
    fetchAllUsers(0, isSearching ? SEARCH_PAGE_SIZE : pageSize);
  }, [sortBy]);

  useEffect(() => {
    if (allUsers.length > 0) {
      fetchRecommendedChefs();
    }
  }, [allUsers]);

  // We only update `searchQuery` when the user presses Enter.
  // This prevents triggering searches while the user is still typing.

  // Apply search + sort whenever the debounced query, allUsers or sort changes
  useEffect(() => {
    const term = searchQuery;
    let filtered = allUsers;
    if (term) {
      filtered = allUsers.filter((user) =>
        user.displayName.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.username.toLowerCase().includes(term)
      );
    }
    // apply selected sort
    filtered = sortUsers(filtered, sortBy);
    setFilteredUsers(filtered);
  }, [searchQuery, allUsers, sortBy]);

  // Re-apply sorting to trending/recommended when sortBy changes
  useEffect(() => {
    setTrendingChefs(prev => sortUsers(prev, sortBy).slice(0, 6));
    setRecommendedChefs(prev => sortUsers(prev, sortBy).slice(0, 6));
  }, [sortBy]);

  const handleFollow = async (userId: number) => {
    if (!currentUser?.id) {
      window.location.href = "/login";
      return;
    }
    // Defensive: if UI already knows this user is followed, don't call follow endpoint
    const findUser = () => {
      return allUsers.find(u => u.id === userId) || filteredUsers.find(u => u.id === userId) || recommendedChefs.find(u => u.id === userId) || trendingChefs.find(u => u.id === userId);
    };

    const local = findUser();
    if (local?.isFollowing) {
      // remove silently
      const removeChefFromLists = (users: UserProfile[]) => users.filter(u => u.id !== userId);
      setAllUsers(prev => removeChefFromLists(prev));
      setFilteredUsers(prev => removeChefFromLists(prev));
      setRecommendedChefs(prev => removeChefFromLists(prev));
      setTrendingChefs(prev => removeChefFromLists(prev));
      try { invalidateCacheForUser(userId); } catch (e) { /* ignore */ }
      try { window.dispatchEvent(new CustomEvent('follow-changed', { detail: { followerId: currentUser.id, followeeId: userId, action: 'follow' } })); } catch (e) {}
      return;
    }

    // Double-check server-side follow status to avoid 409s caused by stale UI
    try {
      const checkResp = await isFollowing(currentUser.id, userId);
      const serverFollows = (checkResp && typeof checkResp === 'object') ? (checkResp.data === true || checkResp === true) : Boolean(checkResp);
      if (serverFollows) {
        const removeChefFromLists = (users: UserProfile[]) => users.filter(u => u.id !== userId);
        setAllUsers(prev => removeChefFromLists(prev));
        setFilteredUsers(prev => removeChefFromLists(prev));
        setRecommendedChefs(prev => removeChefFromLists(prev));
        setTrendingChefs(prev => removeChefFromLists(prev));
        try { invalidateCacheForUser(userId); } catch (e) { /* ignore */ }
        try { window.dispatchEvent(new CustomEvent('follow-changed', { detail: { followerId: currentUser.id, followeeId: userId, action: 'follow' } })); } catch (e) {}
        return;
      }
    } catch (e) {
      // If the check failed, continue to attempt the follow — we'll handle 409s gracefully below
    }

    try {
      const resp = await followUser(currentUser.id, userId);
      // On success: remove the chef from discovery lists
      const removeChefFromLists = (users: UserProfile[]) => users.filter(u => u.id !== userId);
      setAllUsers(prev => removeChefFromLists(prev));
      setFilteredUsers(prev => removeChefFromLists(prev));
      setRecommendedChefs(prev => removeChefFromLists(prev));
      setTrendingChefs(prev => removeChefFromLists(prev));
      try { invalidateCacheForUser(userId); } catch (e) { /* ignore */ }

      // Dispatch a follow-changed event with the canonical server response so other components can update
      try {
        const detail = resp?.data ? { followerId: currentUser.id, followeeId: userId, action: 'follow', follow: resp.data } : { followerId: currentUser.id, followeeId: userId, action: 'follow' };
        window.dispatchEvent(new CustomEvent('follow-changed', { detail }));
      } catch (e) {
        // ignore event dispatch failures
      }
    } catch (err: any) {
      const msg = String(err?.message || "").toLowerCase();
      // Treat Already-following / 409 as success (idempotent)
      if (msg.includes("already following") || msg.includes("alreadyfollow") || msg.includes("409") ) {
        const removeChefFromLists = (users: UserProfile[]) => users.filter(u => u.id !== userId);
        setAllUsers(prev => removeChefFromLists(prev));
        setFilteredUsers(prev => removeChefFromLists(prev));
        setRecommendedChefs(prev => removeChefFromLists(prev));
        setTrendingChefs(prev => removeChefFromLists(prev));
        try { invalidateCacheForUser(userId); } catch (e) { /* ignore */ }
        try {
          window.dispatchEvent(new CustomEvent('follow-changed', { detail: { followerId: currentUser.id, followeeId: userId, action: 'follow' } }));
        } catch (e) {}
        return;
      }

      // Unexpected error — surface it
      console.error("Failed to follow user:", err);
      setError("Failed to follow user. Please try again.");
    }
  };

  const handleUnfollow = async (userId: number) => {
    if (!currentUser?.id) return;

    try {
      await unfollowUser(currentUser.id, userId);

      const updateFollowState = (users: UserProfile[]) =>
        users.map(u => 
          u.id === userId 
            ? { ...u, isFollowing: false, followersCount: Math.max((u.followersCount || 1) - 1, 0) } 
            : u
        );

      setAllUsers(prev => updateFollowState(prev));
      setFilteredUsers(prev => updateFollowState(prev));
      setRecommendedChefs(prev => updateFollowState(prev));
      setTrendingChefs(prev => updateFollowState(prev));
      try { window.dispatchEvent(new CustomEvent('follow-changed', { detail: { followerId: currentUser.id, followeeId: userId, action: 'unfollow' } })); } catch (e) {}

      // re-check server follow status
      try {
        const resp = await isFollowing(currentUser.id, userId);
        const serverFollows = (resp && typeof resp === 'object') ? (resp.data === true || resp === true) : Boolean(resp);
        if (serverFollows) {
          // rollback if server still sees following
          const rollback = (users: UserProfile[]) => users.map(u => u.id === userId ? { ...u, isFollowing: true, followersCount: (u.followersCount || 0) + 1 } : u);
          setAllUsers(prev => rollback(prev));
          setFilteredUsers(prev => rollback(prev));
          setRecommendedChefs(prev => rollback(prev));
          setTrendingChefs(prev => rollback(prev));
        }
        else {
          // Invalidate client cache entries that may contain this user
          try { invalidateCacheForUser(userId); } catch (e) { /* ignore */ }
        }
      } catch (e) {
        // ignore
      }
    } catch (err: any) {
      console.error("Failed to unfollow user:", err);
      setError("Failed to unfollow user. Please try again.");
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 flex items-center gap-2">
                  <ChefHat className="h-8 w-8 text-orange-500" />
                  Discover Chefs
                </h1>
                <p className="text-gray-600 mt-2">Connect with talented chefs from around the world</p>
              </div>
            </div>

            {error && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-4">
                <p className="text-sm text-yellow-800">⚠️ {error}</p>
              </div>
            )}

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search chefs by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const q = searchTerm.trim().toLowerCase();
                    setSearchQuery(q);
                    setCurrentPage(0);
                    // Fetch server-side results with default search page size 16
                    fetchAllUsers(0, 16);
                  }
                }}
                className="pl-12 pr-4 py-3 rounded-lg bg-gray-50 border-gray-300 text-lg"
              />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <label className="text-sm text-gray-600">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border rounded bg-white text-sm"
                aria-label="Sort chefs"
              >
                <option value="recipes">Most Recipes</option>
                <option value="followers">Most Followers</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>
        </div>

        {/* ML-Powered Recommendations */}
        {recommendedChefs.length > 0 && !isSearching && (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-orange-500" />
                Recommended Chefs For You
                <Badge className="ml-2 bg-orange-500 text-white">AI Powered</Badge>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendedChefs.map((chef) => (
                  <ChefCard
                    key={chef.id}
                    chef={chef}
                    onFollow={handleFollow}
                    onUnfollow={handleUnfollow}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!isSearching ? (
            <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
              <TabsTrigger value="all" className="gap-2">
                <Users className="h-4 w-4" />
                All Chefs ({totalUsers || filteredUsers.length})
              </TabsTrigger>
              <TabsTrigger value="trending" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Trending ({trendingChefs.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="h-64 animate-pulse bg-gray-200" />
                  ))}
                </div>
              ) : filteredUsers.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredUsers.map((chef) => (
                      <ChefCard
                        key={chef.id}
                        chef={chef}
                        onFollow={handleFollow}
                        onUnfollow={handleUnfollow}
                      />
                    ))}
                  </div>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-8">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0 || isLoading}
                      >
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          Page {currentPage + 1} of {totalPages}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({totalUsers} total chefs)
                        </span>
                      </div>
                      
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                        disabled={currentPage >= totalPages - 1 || isLoading}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <Card className="p-12 text-center">
                  <p className="text-gray-500">No chefs found. Try adjusting your search.</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="trending">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {trendingChefs.map((chef, index) => (
                  <div key={chef.id} className="relative">
                    {index < 3 && (
                      <div className="absolute -top-3 -left-3 z-10">
                        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          #{index + 1}
                        </Badge>
                      </div>
                    )}
                    <ChefCard
                      chef={chef}
                      onFollow={handleFollow}
                      onUnfollow={handleUnfollow}
                    />
                  </div>
                ))}
              </div>
            </TabsContent>
            </Tabs>
          ) : (
            // Simplified search results view when searching: show only the matched users (up to SEARCH_PAGE_SIZE)
            <div>
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="h-64 animate-pulse bg-gray-200" />
                  ))}
                </div>
              ) : filteredUsers.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredUsers.slice(0, SEARCH_PAGE_SIZE).map((chef) => (
                      <ChefCard
                        key={chef.id}
                        chef={chef}
                        onFollow={handleFollow}
                        onUnfollow={handleUnfollow}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <Card className="p-12 text-center">
                  <p className="text-gray-500">No chefs found. Try adjusting your search.</p>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

const ChefCard = ({
  chef,
  onFollow,
  onUnfollow,
}: {
  chef: UserProfile;
  onFollow: (id: number) => Promise<void> | void;
  onUnfollow: (id: number) => Promise<void> | void;
}) => {
  const [imgError, setImgError] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);
  const imageUrl = imgError 
    ? `https://i.pravatar.cc/150?u=${chef.username || chef.id}`
    : chef.profileUrl || `https://i.pravatar.cc/150?u=${chef.username || chef.id}`;

  const handleFollowClick = async () => {
    setBtnLoading(true);
    try {
      await onFollow(chef.id);
    } catch (e) {
      // swallow, outer handler will set error state
    } finally {
      setBtnLoading(false);
    }
  };

  const handleUnfollowClick = async () => {
    setBtnLoading(true);
    try {
      await onUnfollow(chef.id);
    } catch (e) {
      // swallow
    } finally {
      setBtnLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-shadow">
      <div className="relative h-32 bg-gradient-to-r from-orange-400 to-red-500">
        <img
          src={imageUrl}
          alt={chef.displayName}
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-24 h-24 rounded-full border-4 border-white object-cover"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      </div>

      <div className="pt-16 pb-6 px-6 text-center">
        <Link to={`/profile/${chef.id}`}>
          <h3 className="text-xl font-bold text-gray-900 hover:text-orange-600 transition-colors mb-2">
            {chef.displayName}
          </h3>
        </Link>
        
        <p className="text-sm text-gray-600 line-clamp-2 mb-4 h-10">
          {chef.bio}
        </p>

        {chef.expertise && chef.expertise.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {chef.expertise.slice(0, 3).map((skill, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex justify-center gap-6 mb-4 text-sm text-gray-600">
          <div className="text-center">
            <p className="font-bold text-gray-900">{chef.recipesCount || 0}</p>
            <p>Recipes</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-900">{chef.followersCount || 0}</p>
            <p>Followers</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-900">{chef.followingCount || 0}</p>
            <p>Following</p>
          </div>
        </div>

        {chef.isFollowing ? (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleUnfollowClick}
            disabled={btnLoading}
          >
            <UserCheck className="h-4 w-4" />
            {btnLoading ? 'Processing...' : 'Following'}
          </Button>
        ) : (
          <Button
            className="w-full gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            onClick={handleFollowClick}
            disabled={btnLoading}
          >
            <UserPlus className="h-4 w-4" />
            {btnLoading ? 'Processing...' : 'Follow'}
          </Button>
        )}
      </div>
    </Card>
  );
};
