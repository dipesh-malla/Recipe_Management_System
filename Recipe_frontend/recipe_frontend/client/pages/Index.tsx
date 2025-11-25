import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MainLayout from "@/components/MainLayout";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { getHomeFeatured, getHomeChefs, getHomeStats, getAllRecipes, getAllUsers, getCachedFilteredRecipes, followUser, getFollowing, getCurrentUser, invalidateHomeChefsCache } from "@/lib/api";
import {
  Search,
  ChefHat,
  Heart,
  MessageCircle,
  Share2,
  Clock,
  Users,
  Zap,
  TrendingUp,
  Star,
} from "lucide-react";

export default function Index() {
  const [featuredRecipes, setFeaturedRecipes] = useState<any[]>([]);
  const [trendingChefs, setTrendingChefs] = useState<any[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<number>>(new Set());
  const currentUser = getCurrentUser();
  const [stats, setStats] = useState({
    totalRecipes: 0,
    totalUsers: 0,
    totalCommunity: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(0);
  const [searchTotalElements, setSearchTotalElements] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    fetchDynamicData();
  }, []);

  const fetchDynamicData = async () => {
    try {
      setIsLoading(true);
      // Fetch featured recipes, chefs and stats from our server-side cached endpoints
      const [featuredResp, chefsResp, statsResp] = await Promise.allSettled([
        getHomeFeatured(),
        getHomeChefs(),
        getHomeStats(),
      ]);

      let recipes: any[] = [];
      if (featuredResp.status === 'fulfilled') {
        const r = featuredResp.value;
        recipes = r?.data?.content ?? r?.data ?? r ?? [];
      }
      // fallback: if server cached endpoint returned no recipes, try calling Java backend directly
      if ((!recipes || recipes.length === 0) && (typeof getAllRecipes === 'function')) {
        try {
          const direct = await getAllRecipes(0, 6, "createdDate", "DESC");
          const directList = direct?.data?.content ?? direct?.data ?? direct ?? [];
          if (Array.isArray(directList) && directList.length > 0) recipes = directList;
        } catch (e) {
          // ignore — keep recipes empty
        }
      }

      const formattedRecipes = (recipes || []).map((recipe: any) => ({
        id: recipe.id,
        title: recipe.title,
        image: recipe.media?.[0]?.url || recipe.image || `https://placehold.co/400x300/e2e8f0/64748b?text=${encodeURIComponent(String(recipe.title || recipe.author?.displayName || 'Recipe'))}`,
        cuisine: recipe.cuisine || "International",
        difficulty: recipe.difficulty || "Medium",
        cookTime: recipe.cookTime || recipe.cook_time || 30,
        author: {
          id: recipe.author?.id ?? recipe.authorId ?? recipe.author_id ?? null,
          displayName: recipe.authorName || recipe.author?.displayName || recipe.author?.name || (typeof recipe.author === 'string' ? recipe.author : (recipe.author?.username ?? 'Chef')),
          profile: { url: recipe.author?.profile?.url || recipe.authorImage || recipe.author?.avatar || null },
        },
        reactions: recipe.reactionsCount || recipe.reactions || 0,
        comments: recipe.commentsCount || 0,
      }));

      // Safeguard: ensure recipes are sorted by reactions (descending) on the client
      formattedRecipes.sort((a: any, b: any) => (b.reactions || 0) - (a.reactions || 0));

      setFeaturedRecipes(formattedRecipes);

      // compute totalRecipesFromPage early so downstream logic can reference it
      let totalRecipesFromPage = 0;
      if (featuredResp.status === 'fulfilled') {
        const r = featuredResp.value;
        totalRecipesFromPage = r?.data?.totalElements ?? r?.totalElements ?? (Array.isArray(r?.data) ? r.data.length : formattedRecipes.length);
      }

      // Fetch top users/chefs and community stats in parallel to speed up page load
      // chefs and stats responses
      let usersArray: any[] = [];
      if (chefsResp.status === 'fulfilled') {
        // getHomeChefs now returns an array (normalized)
        usersArray = Array.isArray(chefsResp.value) ? chefsResp.value : (chefsResp.value?.data ?? chefsResp.value?.content ?? []);
      }

      // fallback: if no chefs returned, call Java users endpoint directly
      if ((!usersArray || usersArray.length === 0) && (typeof getAllUsers === 'function')) {
        try {
          const direct = await getAllUsers(0, 4);
          const list = direct?.data?.content ?? direct?.data ?? direct ?? [];
          usersArray = Array.isArray(list) ? list : (list?.content ?? []);
        } catch (e) {
          // ignore
        }
      }

      // If user is signed in, fetch their following list so we can hide already-followed chefs
      const currentUser = getCurrentUser();
      const userFollowingSet = new Set<number>();
      if (currentUser && currentUser.id) {
        try {
          const followingResp = await getFollowing(currentUser.id);
          let followingArray: any[] = Array.isArray(followingResp) ? followingResp : (followingResp?.data ?? followingResp?.data?.data ?? followingResp?.data?.content ?? followingResp?.content ?? []);
          if (Array.isArray(followingArray)) {
            for (const f of followingArray) {
              const id = f?.id ?? f?.followeeId ?? f?.userId ?? f?.followee?.id ?? null;
              if (id) userFollowingSet.add(Number(id));
            }
          }
        } catch (e) {
          // ignore following fetch errors
        }
        // Also ensure we don't show the current user in the chef discovery list
        userFollowingSet.add(Number(currentUser.id));
      }

      // `getHomeChefs` now returns normalized chef DTOs: {id,name,specialty,followers,recipes,image}
      // Filter out chefs the current user already follows (client-side)
      if (userFollowingSet.size > 0) {
        usersArray = (usersArray || []).filter((u: any) => !userFollowingSet.has(Number(u.id)));
      }

      const formattedChefs = usersArray.length > 0 ? usersArray.map((u: any) => ({
        id: u.id,
        name: u.name ?? u.displayName ?? u.username ?? `User ${u.id}`,
        specialty: u.specialty ?? 'General Cuisine',
        followers: Number(u.followers ?? u.followersCount ?? u.followers_count ?? u.stats?.followersCount ?? 0) || 0,
        recipes: Number(u.recipes ?? u.recipeCount ?? u.recipe_count ?? u.stats?.recipeCount ?? 0) || 0,
        image: u.image ?? u.profile?.url ?? `https://i.pravatar.cc/150?u=${u.id}`,
      })) : [
        { id: 1, name: 'Chef Marco', specialty: 'Italian Cuisine', followers: 15240, recipes: 48, image: 'https://placehold.co/150x150/fecaca/991b1b?text=Chef+M' },
        { id: 2, name: 'Chef Priya', specialty: 'Indian & Fusion', followers: 12850, recipes: 62, image: 'https://placehold.co/150x150/bfdbfe/1e40af?text=Chef+P' },
        { id: 3, name: 'Chef Takeshi', specialty: 'Japanese Cuisine', followers: 18900, recipes: 74, image: 'https://placehold.co/150x150/fde68a/ca8a04?text=Chef+T' },
        { id: 4, name: 'Chef Sofia', specialty: 'Mediterranean', followers: 11240, recipes: 55, image: 'https://placehold.co/150x150/bbf7d0/15803d?text=Chef+S' },
      ];

      setTrendingChefs(formattedChefs);

      let communityCount = 500;
      if (statsResp.status === 'fulfilled') {
        const r = statsResp.value;
        communityCount = r?.totalCommunity ?? r?.data?.totalCommunity ?? r?.totalCommunity ?? r?.totalCommunity ?? communityCount;
      }

      // Prefer totals reported by the server stats endpoint when available
      let totalRecipesFromStats = 0;
      let totalUsersFromStats = 0;
      if (statsResp.status === 'fulfilled') {
        const r = statsResp.value;
        totalRecipesFromStats = r?.totalRecipes ?? r?.data?.totalRecipes ?? r?.totalRecipesCount ?? r?.data?.totalRecipesCount ?? 0;
        totalUsersFromStats = r?.totalUsers ?? r?.data?.totalUsers ?? r?.totalUsersCount ?? r?.data?.totalUsersCount ?? 0;
      }

      setStats({
        totalRecipes: totalRecipesFromStats > 0 ? totalRecipesFromStats : (totalRecipesFromPage > 0 ? totalRecipesFromPage : 50),
        totalUsers: totalUsersFromStats > 0 ? totalUsersFromStats : (usersArray.length || 25),
        totalCommunity: communityCount || 500,
      });

    } catch (error) {
      console.error("Failed to fetch dynamic data:", error);
      // Set fallback data
      setStats({
        totalRecipes: 50,
        totalUsers: 25,
        totalCommunity: 500,
      });
    } finally {
      setIsLoading(false);
    }
  };

    // Search helper: perform cached filtered search (page size 16)
    async function performSearch(pageIndex: number) {
      const q = (searchTerm || "").trim();
      if (!q) {
        setIsSearching(false);
        setSearchResults([]);
        setSearchPage(1);
        setSearchTotalPages(0);
        setSearchTotalElements(0);
        return;
      }

      setIsSearching(true);
      setSearchLoading(true);
      try {
        const resp = await getCachedFilteredRecipes({ searchTerm: q, page: pageIndex, size: 16 });
        const content = resp?.data?.content ?? resp?.content ?? resp?.data ?? [];
        const totalElements = resp?.data?.totalElements ?? resp?.totalElements ?? (Array.isArray(content) ? content.length : 0);
        const totalPages = resp?.data?.totalPages ?? resp?.totalPages ?? Math.ceil((totalElements || 0) / 16);

        const formatted = (Array.isArray(content) ? content : []).map((recipe: any) => ({
          id: recipe.id,
          title: recipe.title,
          image: recipe.media?.[0]?.url || recipe.image || `https://placehold.co/400x300/e2e8f0/64748b?text=${encodeURIComponent(String(recipe.title || 'Recipe'))}`,
          cuisine: recipe.cuisine || "International",
          difficulty: recipe.difficulty || "Medium",
          cookTime: recipe.cookTime || recipe.cook_time || 30,
          author: {
            id: recipe.author?.id ?? recipe.authorId ?? recipe.author_id ?? null,
            displayName: recipe.authorName || recipe.author?.displayName || recipe.author?.name || (typeof recipe.author === 'string' ? recipe.author : (recipe.author?.username ?? 'Chef')),
            profile: { url: recipe.author?.profile?.url || recipe.authorImage || recipe.author?.avatar || null },
          },
          reactions: recipe.reactionsCount || recipe.reactions || 0,
          comments: recipe.commentsCount || 0,
        }));

        formatted.sort((a: any, b: any) => (b.reactions || 0) - (a.reactions || 0));

        setSearchResults(formatted);
        setSearchPage((pageIndex || 0) + 1);
        setSearchTotalPages(totalPages);
        setSearchTotalElements(totalElements);
      } catch (err) {
        console.error("performSearch failed", err);
        setSearchResults([]);
        setSearchPage(1);
        setSearchTotalPages(0);
        setSearchTotalElements(0);
      } finally {
        setSearchLoading(false);
      }
    }

    // Handle following a chef: optimistic UI + backend call + cache invalidation
    const handleFollow = async (chefId: number) => {
      const currentUser = getCurrentUser();
      if (!currentUser || !currentUser.id) {
        window.location.href = '/login';
        return;
      }

      // Defensive: do not attempt to follow yourself
      if (Number(currentUser.id) === Number(chefId)) {
        console.warn('Attempted to follow self; ignoring');
        return;
      }

      // Optimistic remove from list
      setTrendingChefs((prev) => prev.filter((c) => Number(c.id) !== Number(chefId)));
      setFollowedIds((prev) => new Set(prev).add(Number(chefId)));

      try {
        await followUser(currentUser.id, chefId);
        // Invalidate proxy cache to keep other clients/requests consistent
        try { await invalidateHomeChefsCache(); } catch (e) { /* ignore */ }
      } catch (err) {
        console.error('Follow failed', err);
        // revert by reloading data
        try { await fetchDynamicData(); } catch (e) { /* ignore */ }
      }
    };

    const formatCount = (n: number | undefined, fallback: string) => {
      const num = Number(n || 0);
      if (num >= 1000) return `${Math.floor(num / 1000)}K+`;
      if (num > 0) return `${num}+`;
      return fallback;
    };

    return (
    <MainLayout>
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-3xl"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                Share Your Culinary{" "}
                <span className="text-yellow-200">Passion</span>
              </h1>
              <p className="text-lg sm:text-xl text-orange-50 max-w-lg">
                Discover, create, and share amazing recipes with a global
                community of food lovers and aspiring chefs.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/discover?section=recipes">
                  <Button className="rounded-full bg-white text-orange-600 hover:bg-gray-100 font-semibold px-8 py-6 text-lg">
                    Explore Recipes
                  </Button>
                </Link>
                <Link to="/register">
                  <Button
                    variant="outline"
                    className="rounded-full bg-transparent border-2 border-white text-white hover:bg-white/10 font-semibold px-8 py-6 text-lg"
                  >
                    Start Sharing
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap gap-8 pt-4">
                <div>
                  <div className="text-3xl font-bold">10K+</div>
                  <div className="text-orange-100">Recipes</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">5K+</div>
                  <div className="text-orange-100">Chefs</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">1K+</div>
                  <div className="text-orange-100">Community</div>
                </div>
              </div>
            </div>

            <div className="hidden md:block relative">
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl">
                {/* Replaced generic placeholder with a high-quality Unsplash culinary image. */}
                <picture>
                  <source
                    srcSet="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=60 800w, https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=60 1200w"
                    type="image/jpeg"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80"
                    alt="Assorted fresh ingredients and prepared dishes representing community recipes"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </picture>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Search Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10 mb-16">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    await performSearch(0);
                  }
                }}
                placeholder="Search recipes, cuisines, ingredients..."
                className="pl-12 pr-4 py-3 rounded-lg bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <Button
              className="rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 px-8"
              onClick={async () => await performSearch(0)}
            >
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Section (hide while searching) */}
      {!isSearching && (
      <div className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 text-orange-500 mx-auto mb-3" />
              <div className="text-3xl font-bold text-gray-900">30K+</div>
                <p className="text-gray-600">Monthly Active Users</p>
            </div>
            <div className="text-center">
                <ChefHat className="h-8 w-8 text-orange-500 mx-auto mb-3" />
                <div className="text-3xl font-bold text-gray-900">5K+</div>
                <p className="text-gray-600">Professional Chefs</p>
            </div>
            <div className="text-center">
                <Heart className="h-8 w-8 text-orange-500 mx-auto mb-3" />
                <div className="text-3xl font-bold text-gray-900">20K+</div>
                <p className="text-gray-600">Recipes Saved</p>
            </div>
            <div className="text-center">
                <Users className="h-8 w-8 text-orange-500 mx-auto mb-3" />
                <div className="text-3xl font-bold text-gray-900">5K+</div>
                <p className="text-gray-600">Daily Interactions</p>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Featured Recipes Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {isSearching ? `Search Results${searchTerm ? ` for "${searchTerm}"` : ''}` : 'Trending Now'}
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl">
            {isSearching ? `Showing recipes matching "${searchTerm}". Use Prev/Next to page results.` : 'Discover the most loved and shared recipes from our vibrant community of food enthusiasts.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={`skeleton-${i}`} className="overflow-hidden h-full animate-pulse">
                <div className="h-48 bg-gray-300"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-6 bg-gray-300 rounded"></div>
                  <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                </div>
              </Card>
            ))
          ) : isSearching ? (
            // Searching: show search results or loading / no results
            searchLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={`search-skel-${i}`} className="overflow-hidden h-full animate-pulse">
                  <div className="h-48 bg-gray-300"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-6 bg-gray-300 rounded"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                  </div>
                </Card>
              ))
            ) : searchResults.length > 0 ? (
              searchResults.map((recipe) => (
              <Link key={recipe.id} to={`/recipes/${recipe.id}`}>
                <Card className="overflow-hidden hover:shadow-xl transition-shadow cursor-pointer h-full">
                  <div className="relative h-48 overflow-hidden bg-gray-200">
                    <img
                      src={recipe.image}
                      alt={recipe.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-orange-500 text-white">
                        {recipe.difficulty}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-sm text-orange-600 font-semibold">
                        {recipe.cuisine}
                      </p>
                      <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
                        {recipe.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {recipe.cookTime}m
                      </div>
                      <div className="flex items-center gap-2">
                        {recipe.author?.profile?.url ? (
                          <img src={recipe.author.profile.url} alt={recipe.author.displayName} className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <ChefHat className="h-4 w-4" />
                        )}
                        <span>{recipe.author.displayName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-gray-600 border-t pt-3">
                      <button className="flex items-center gap-1 hover:text-red-500 transition">
                        <Heart className="h-4 w-4" />
                        <span className="text-sm">{recipe.reactions}</span>
                      </button>
                      <button className="flex items-center gap-1 hover:text-blue-500 transition">
                        <MessageCircle className="h-4 w-4" />
                        <span className="text-sm">{recipe.comments}</span>
                      </button>
                      <button className="flex items-center gap-1 hover:text-green-500 transition ml-auto" title="Share">
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              </Link>
              ))
            ) : (
            // Fallback message
            <div className="col-span-full text-center py-12 text-gray-500">
              <p>No results found for your search. Try a different keyword.</p>
            </div>
            )
          ) : featuredRecipes.length > 0 ? (
            featuredRecipes.map((recipe) => (
              <Link key={recipe.id} to={`/recipes/${recipe.id}`}>
                <Card className="overflow-hidden hover:shadow-xl transition-shadow cursor-pointer h-full">
                  <div className="relative h-48 overflow-hidden bg-gray-200">
                    <img
                      src={recipe.image}
                      alt={recipe.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-orange-500 text-white">
                        {recipe.difficulty}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-sm text-orange-600 font-semibold">
                        {recipe.cuisine}
                      </p>
                      <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
                        {recipe.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {recipe.cookTime}m
                      </div>
                      <div className="flex items-center gap-2">
                        {recipe.author?.profile?.url ? (
                          <img src={recipe.author.profile.url} alt={recipe.author.displayName} className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <ChefHat className="h-4 w-4" />
                        )}
                        <span>{recipe.author.displayName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-gray-600 border-t pt-3">
                      <button className="flex items-center gap-1 hover:text-red-500 transition">
                        <Heart className="h-4 w-4" />
                        <span className="text-sm">{recipe.reactions}</span>
                      </button>
                      <button className="flex items-center gap-1 hover:text-blue-500 transition">
                        <MessageCircle className="h-4 w-4" />
                        <span className="text-sm">{recipe.comments}</span>
                      </button>
                      <button className="flex items-center gap-1 hover:text-green-500 transition ml-auto" title="Share">
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          ) : (
            // Fallback message
            <div className="col-span-full text-center py-12 text-gray-500">
              <p>No recipes available. Start sharing your first recipe!</p>
            </div>
          )}
        </div>

        {/* Pagination / View All */}
        <div className="mt-8 flex items-center justify-between">
          {isSearching ? (
            <div className="flex-1">
              <div className="text-sm text-gray-600">Showing page {searchPage} of {searchTotalPages} — {searchTotalElements} results</div>
            </div>
          ) : (
            <div />
          )}

          <div className="flex gap-4">
            {isSearching ? (
              <>
                <Button disabled={searchPage <= 1} onClick={async () => await performSearch(Math.max(0, searchPage - 2))}>Prev</Button>
                <Button disabled={searchPage >= (searchTotalPages || 1)} onClick={async () => await performSearch(searchPage)} >Next</Button>
              </>
            ) : (
              <Link to="/discover?section=recipes">
                <Button
                  size="lg"
                  className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 px-8"
                >
                  View All Recipes
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Trending Chefs Section */}
      {!isSearching && (
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Follow Top Chefs
            </h2>
            <div className="flex items-start justify-between gap-4">
              <p className="text-gray-600 text-lg max-w-2xl">
                Connect with renowned chefs and food creators from around the
                world.
              </p>
              <div className="ml-4">
                <Link to="/discover?section=chefs">
                  <Button className="rounded-full bg-white text-orange-600 hover:bg-gray-100 font-semibold px-4 py-2">
                    View All Chefs
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {isLoading ? (
              // Loading skeleton for chefs
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={`chef-skeleton-${i}`} className="text-center p-6 animate-pulse">
                  <div className="w-24 h-24 rounded-full bg-gray-300 mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2 mx-auto mb-4"></div>
                  <div className="h-10 bg-gray-300 rounded"></div>
                </Card>
              ))
            ) : trendingChefs.length > 0 ? (
              trendingChefs.map((chef) => (
                <Card
                  key={chef.id}
                  className="text-center p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="mb-4">
                    <img
                      src={chef.image}
                      alt={chef.name}
                      className="w-24 h-24 rounded-full mx-auto object-cover"
                    />
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {chef.name}
                  </h3>
                  <p className="text-sm text-orange-600 font-semibold mb-4 line-clamp-1">
                    {chef.specialty}
                  </p>

                  <div className="flex justify-center gap-6 mb-6 text-sm text-gray-600">
                    <div>
                      <div className="font-bold text-gray-900">
                        {chef.followers > 0 ? chef.followers.toLocaleString() : '0'}
                      </div>
                      <div>Followers</div>
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">
                        {chef.recipes}
                      </div>
                      <div>Recipes</div>
                    </div>
                  </div>

                  {Number(currentUser?.id) === Number(chef.id) ? (
                    <Button disabled className="w-full rounded-full bg-gray-200 text-gray-600">You</Button>
                  ) : followedIds.has(Number(chef.id)) ? (
                    <Button disabled className="w-full rounded-full bg-gray-200 text-gray-600">Following</Button>
                  ) : (
                    <Button onClick={() => handleFollow(chef.id)} className="w-full rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600">
                      Follow
                    </Button>
                  )}
                </Card>
              ))
            ) : (
              // Fallback message
              <div className="col-span-full text-center py-12 text-gray-500">
                <p>No chefs to display. Be the first to join!</p>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Why Choose RecipeShare?
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="p-6">
            <div className="bg-gradient-to-r from-orange-100 to-red-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Easy Sharing
            </h3>
            <p className="text-gray-600">
              Share your recipes with beautiful formatting, images, and
              step-by-step instructions. Make cooking accessible for everyone.
            </p>
          </Card>

          <Card className="p-6">
            <div className="bg-gradient-to-r from-orange-100 to-red-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Heart className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Community Driven
            </h3>
            <p className="text-gray-600">
              Connect with food enthusiasts, get feedback, and build your
              culinary network with like-minded creators.
            </p>
          </Card>

          <Card className="p-6">
            <div className="bg-gradient-to-r from-orange-100 to-red-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Star className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Smart Recommendations
            </h3>
            <p className="text-gray-600">
              Discover recipes tailored to your taste, dietary preferences, and
              cooking skill level.
            </p>
          </Card>
        </div>
      </div>

      {/* CTA Section — show full CTA only for guests; show a minimal dynamic banner for logged-in users */}
      {!currentUser ? (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold">Ready to Share Your First Recipe?</h2>
            <p className="text-lg text-orange-50">
              Join thousands of chefs and food lovers building the world's largest recipe community.
            </p>
            <Link to="/register">
              <Button className="rounded-full bg-white text-orange-600 hover:bg-gray-100 font-semibold px-8 py-6 text-lg">
                Get Started Today
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white border-t mt-8 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-gradient-to-r from-orange-50 to-red-50 p-3">
                <ChefHat className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Welcome back, <span className="font-semibold text-gray-900">{currentUser.displayName || currentUser.username || 'Chef'}</span></div>
                <div className="text-xs text-gray-500">Here's a quick snapshot of the community</div>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-6">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">10K+</div>
                <div className="text-xs text-gray-600">Recipes</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">5K+</div>
                <div className="text-xs text-gray-600">Chefs</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">1K+</div>
                <div className="text-xs text-gray-600">Community</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/discover?section=recipes">
                <Button className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2">Explore</Button>
              </Link>
              <Link to="/create-recipe">
                <Button variant="outline" className="rounded-full">Create</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
