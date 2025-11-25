import MainLayout from "@/components/MainLayout";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { getHomeFeatured, getHomeChefs, getAllRecipes, getCachedFilteredRecipes, getChefs } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SimpleRecipe {
  id: number;
  title: string;
  image?: string;
  cuisine?: string;
  cookTime?: number;
  author?: { id?: number; displayName: string; profile?: { url?: string } } | string;
}

interface SimpleChef {
  id: number;
  name: string;
  specialty?: string;
  followers?: number;
  recipes?: number;
  image?: string;
}

export default function Discover() {
  const [recipes, setRecipes] = useState<SimpleRecipe[]>([]);
  const [chefs, setChefs] = useState<SimpleChef[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [loadingChefs, setLoadingChefs] = useState(true);
  // Search states (support ?search=... pagination)
  const [searchParams] = useSearchParams();
  const initialQuery = String(searchParams.get('search') || '').trim();
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(initialQuery.length > 0);
  const [searchResults, setSearchResults] = useState<SimpleRecipe[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(0);
  const [searchTotalElements, setSearchTotalElements] = useState(0);
  // Chef search states
  const [chefResults, setChefResults] = useState<SimpleChef[]>([]);
  const [chefLoading, setChefLoading] = useState(false);
  const [chefPage, setChefPage] = useState(1);
  const [chefTotalPages, setChefTotalPages] = useState(0);
  const [chefTotalElements, setChefTotalElements] = useState(0);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoadingRecipes(true);
        const resp = await getHomeFeatured();
        // normalize shapes returned by getHomeFeatured
        const raw = resp?.data ?? resp ?? [];
        const arr = Array.isArray(raw) ? raw : raw?.content ?? raw?.data ?? [];
        if (!mounted) return;
        const formatted = (arr || []).slice(0, 6).map((r: any, idx: number) => ({
          id: r.id || r.recipe_id || idx + 1,
          title: r.title || r.name || `Recipe ${r.id || idx + 1}`,
          image: r.media?.[0]?.url || r.image || r.img || `https://placehold.co/400x300/e2e8f0/64748b?text=${encodeURIComponent(String(r.title || `Recipe ${idx+1}`))}`,
          cuisine: r.cuisine,
          cookTime: r.cookTime || r.cook_time || 0,
          author: ((): any => {
            const candidate = r.author || r.createdBy || r.user || {};
            const id = candidate?.id || r.authorId || undefined;
            const displayName = r.authorName || candidate?.displayName || candidate?.name || r.createdBy?.displayName || 'Unknown';
            const profile = candidate?.profile?.url || candidate?.profileUrl || candidate?.avatar || (id ? `https://i.pravatar.cc/150?u=${id}` : undefined);
            return { id, displayName, profile: profile ? { url: profile } : undefined };
          })(),
        }));
        // If the proxy returned no featured recipes, try calling Java backend directly as a fallback
        if ((formatted || []).length === 0) {
          try {
            console.warn('Discover: home featured empty — falling back to getAllRecipes');
            const direct = await getAllRecipes(0, 6, 'likeCount', 'DESC');
            const directRaw = direct?.data ?? direct ?? [];
            const directArr = Array.isArray(directRaw) ? directRaw : directRaw?.content ?? directRaw?.data ?? [];
            const directFormatted = (directArr || []).slice(0, 6).map((r: any, idx: number) => ({
              id: r.id || r.recipe_id || idx + 1,
              title: r.title || r.name || `Recipe ${r.id || idx + 1}`,
              image: r.media?.[0]?.url || r.image || r.img || `https://placehold.co/400x300/e2e8f0/64748b?text=${encodeURIComponent(String(r.title || `Recipe ${idx+1}`))}`,
              cuisine: r.cuisine,
              cookTime: r.cookTime || r.cook_time || 0,
              author: r.authorName || r.author?.displayName || r.author || r.createdBy?.displayName || 'Unknown',
            }));
            setRecipes(directFormatted);
          } catch (e) {
            setRecipes(formatted);
          }
        } else {
          setRecipes(formatted);
        }
      } catch (e) {
        setRecipes([]);
      } finally {
        setLoadingRecipes(false);
      }
    })();

    (async () => {
      try {
        setLoadingChefs(true);
        const resp = await getHomeChefs();
        const arr = Array.isArray(resp) ? resp : resp ?? [];
        const formatted = (arr || []).slice(0, 6).map((u: any, idx: number) => ({
          id: u.id || idx + 1,
          name: u.displayName || u.name || u.username || `Chef ${idx + 1}`,
          specialty: u.specialty || (u.expertise && u.expertise[0]) || 'General Cuisine',
          followers: u.followers ?? u.followersCount ?? 0,
          recipes: u.recipes ?? u.recipeCount ?? 0,
          image: u.profile?.url || u.profileUrl || u.avatar || `https://i.pravatar.cc/150?u=${u.id || idx}`,
        }));
        if (mounted) setChefs(formatted);
      } catch (e) {
        setChefs([]);
      } finally {
        setLoadingChefs(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Perform cached filtered search when `search` query param is present
  useEffect(() => {
    const q = String(searchParams.get('search') || '').trim();
    const section = String(searchParams.get('section') || '').toLowerCase();
    setSearchTerm(q);
    setIsSearching(!!q);
    if (!q) {
      setSearchResults([]);
      setSearchPage(1);
      setSearchTotalPages(0);
      setSearchTotalElements(0);
      setChefResults([]);
      setChefPage(1);
      setChefTotalPages(0);
      setChefTotalElements(0);
      return;
    }

    let mounted = true;

    const doRecipeSearch = async (pageIndex = 0) => {
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

        if (!mounted) return { formatted: [], totalPages: 0, totalElements: 0 };
        formatted.sort((a: any, b: any) => (b.reactions || 0) - (a.reactions || 0));
        setSearchResults(formatted);
        setSearchPage((pageIndex || 0) + 1);
        setSearchTotalPages(totalPages);
        setSearchTotalElements(totalElements);
        return { formatted, totalPages, totalElements };
      } catch (err) {
        console.error('Discover recipe search failed', err);
        if (!mounted) return { formatted: [], totalPages: 0, totalElements: 0 };
        setSearchResults([]);
        setSearchPage(1);
        setSearchTotalPages(0);
        setSearchTotalElements(0);
        return { formatted: [], totalPages: 0, totalElements: 0 };
      } finally {
        if (!mounted) return;
        setSearchLoading(false);
      }
    };

    const doChefSearch = async (pageIndex = 0) => {
      setChefLoading(true);
      try {
        const resp = await getChefs(pageIndex, 16, q, 'recipes', 'DESC');
        const arr = Array.isArray(resp) ? resp : resp?.data ?? resp?.content ?? resp ?? [];
        const totalElements = resp?.data?.totalElements ?? resp?.totalElements ?? (Array.isArray(arr) ? arr.length : 0);
        const totalPages = resp?.data?.totalPages ?? resp?.totalPages ?? Math.ceil((totalElements || 0) / 16);
        const formatted = (Array.isArray(arr) ? arr : []).map((u: any, idx: number) => ({
          id: u.id,
          name: u.displayName || u.name || u.username || `Chef ${u.id || idx}`,
          specialty: u.specialty || (u.expertise && u.expertise[0]) || 'General Cuisine',
          followers: u.followers ?? u.followersCount ?? 0,
          recipes: u.recipes ?? u.recipeCount ?? 0,
          image: u.profile?.url || u.profileUrl || u.avatar || `https://i.pravatar.cc/150?u=${u.id}`,
        }));

        if (!mounted) return { formatted: [], totalPages: 0, totalElements: 0 };
        setChefResults(formatted);
        setChefPage((pageIndex || 0) + 1);
        setChefTotalPages(totalPages);
        setChefTotalElements(totalElements);
        return { formatted, totalPages, totalElements };
      } catch (err) {
        console.error('Discover chef search failed', err);
        if (!mounted) return { formatted: [], totalPages: 0, totalElements: 0 };
        setChefResults([]);
        setChefPage(1);
        setChefTotalPages(0);
        setChefTotalElements(0);
        return { formatted: [], totalPages: 0, totalElements: 0 };
      } finally {
        if (!mounted) return;
        setChefLoading(false);
      }
    };

    (async () => {
      if (section === 'chefs') {
        await doChefSearch(0);
        return;
      }

      // Default: recipes search, but if no recipe results are found, fall back to chefs
      const recipeResult = await doRecipeSearch(0);
      if (recipeResult && Array.isArray((recipeResult as any).formatted) && (recipeResult as any).formatted.length === 0) {
        await doChefSearch(0);
      }
    })();

    return () => { mounted = false; };
  }, [searchParams]);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Discover</h1>
        </div>

        {/* Trending Recipes Section */}
        <section className="mb-12">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">{isSearching ? `Search Results${searchTerm ? ` for "${searchTerm}"` : ''}` : 'Trending Now'}</h2>
              <p className="text-gray-600 mt-1">{(() => {
                const section = String(searchParams.get('section') || '').toLowerCase();
                if (isSearching && section === 'chefs') return `Showing chefs matching "${searchTerm}".`;
                if (isSearching) return `Showing recipes matching "${searchTerm}".`;
                return 'Discover the most loved and shared recipes from our vibrant community of food enthusiasts.';
              })()}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/recipes">
                <Button>View All Recipes</Button>
              </Link>
            </div>
          </div>

          <div>
            {isSearching ? (() => {
              const section = String(searchParams.get('section') || '').toLowerCase();
              if (section === 'chefs') {
                // Show chef search results
                if (chefLoading) {
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[...Array(6)].map((_, i) => (
                        <Card key={i} className="h-48 animate-pulse bg-gray-200" />
                      ))}
                    </div>
                  );
                }

                if (!chefResults || chefResults.length === 0) {
                  return <p className="text-gray-600">No chefs found matching your search.</p>;
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {chefResults.map((c) => (
                      <Link key={c.id} to={`/profile/${c.id}`}>
                        <ChefCard chef={c} />
                      </Link>
                    ))}
                  </div>
                );
              }

              // Default: recipe search (but if empty and chefs are available, show chefs fallback)
              if (searchLoading) {
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i} className="h-48 animate-pulse bg-gray-200" />
                    ))}
                  </div>
                );
              }

              if (searchResults && searchResults.length > 0) {
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {searchResults.map((r) => (
                      <RecipeCard key={r.id} recipe={r} />
                    ))}
                  </div>
                );
              }

              // Fallback: if we have chefResults from the fallback search, show chefs
              if (chefResults && chefResults.length > 0) {
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {chefResults.map((c) => (
                      <Link key={c.id} to={`/profile/${c.id}`}>
                        <ChefCard chef={c} />
                      </Link>
                    ))}
                  </div>
                );
              }

              return <p className="text-gray-600">No results found for your search.</p>;
            })() : (
              loadingRecipes ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="h-48 animate-pulse bg-gray-200" />
                  ))}
                </div>
              ) : recipes.length === 0 ? (
                <p className="text-gray-600">No trending recipes available right now.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recipes.map((r) => (
                    <RecipeCard key={r.id} recipe={r} />
                  ))}
                </div>
              )
            )}
          </div>

          {/* Pagination / View All when searching */}
          {isSearching && (() => {
            const section = String(searchParams.get('section') || '').toLowerCase();
            if (section === 'chefs') {
              return (
                <div className="mt-8 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm text-gray-600">Showing page {chefPage} of {chefTotalPages} — {chefTotalElements} results</div>
                  </div>
                  <div className="flex gap-4">
                    <Button disabled={chefPage <= 1} onClick={async () => {
                      const pageIndex = Math.max(0, chefPage - 2);
                      try {
                        setChefLoading(true);
                        const resp = await getChefs(pageIndex, 16, searchTerm, 'recipes', 'DESC');
                        const arr = Array.isArray(resp) ? resp : resp?.data ?? resp?.content ?? resp ?? [];
                        const formatted = (Array.isArray(arr) ? arr : []).map((u: any, idx: number) => ({
                          id: u.id,
                          name: u.displayName || u.name || u.username || `Chef ${u.id || idx}`,
                          specialty: u.specialty || (u.expertise && u.expertise[0]) || 'General Cuisine',
                          followers: u.followers ?? u.followersCount ?? 0,
                          recipes: u.recipes ?? u.recipeCount ?? 0,
                          image: u.profile?.url || u.profileUrl || u.avatar || `https://i.pravatar.cc/150?u=${u.id}`,
                        }));
                        setChefResults(formatted);
                        setChefPage(pageIndex + 1);
                      } catch (e) {
                        console.error('Prev chefs page failed', e);
                      } finally { setChefLoading(false); }
                    }}>Prev</Button>

                    <Button disabled={chefPage >= (chefTotalPages || 1)} onClick={async () => {
                      const pageIndex = Math.max(0, chefPage);
                      try {
                        setChefLoading(true);
                        const resp = await getChefs(pageIndex, 16, searchTerm, 'recipes', 'DESC');
                        const arr = Array.isArray(resp) ? resp : resp?.data ?? resp?.content ?? resp ?? [];
                        const formatted = (Array.isArray(arr) ? arr : []).map((u: any, idx: number) => ({
                          id: u.id,
                          name: u.displayName || u.name || u.username || `Chef ${u.id || idx}`,
                          specialty: u.specialty || (u.expertise && u.expertise[0]) || 'General Cuisine',
                          followers: u.followers ?? u.followersCount ?? 0,
                          recipes: u.recipes ?? u.recipeCount ?? 0,
                          image: u.profile?.url || u.profileUrl || u.avatar || `https://i.pravatar.cc/150?u=${u.id}`,
                        }));
                        setChefResults(formatted);
                        setChefPage(pageIndex + 1);
                      } catch (e) {
                        console.error('Next chefs page failed', e);
                      } finally { setChefLoading(false); }
                    }}>Next</Button>
                  </div>
                </div>
              );
            }

            // default: recipe pagination
            return (
              <div className="mt-8 flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Showing page {searchPage} of {searchTotalPages} — {searchTotalElements} results</div>
                </div>
                <div className="flex gap-4">
                  <Button disabled={searchPage <= 1} onClick={async () => {
                    const pageIndex = Math.max(0, searchPage - 2);
                    // perform a new search for previous page
                    try {
                      setSearchLoading(true);
                      const resp = await getCachedFilteredRecipes({ searchTerm, page: pageIndex, size: 16 });
                      const content = resp?.data?.content ?? resp?.content ?? resp?.data ?? [];
                      const formatted = (Array.isArray(content) ? content : []).map((recipe: any) => ({
                        id: recipe.id,
                        title: recipe.title,
                        image: recipe.media?.[0]?.url || recipe.image || `https://placehold.co/400x300/e2e8f0/64748b?text=${encodeURIComponent(String(recipe.title || 'Recipe'))}`,
                        cuisine: recipe.cuisine || "International",
                        difficulty: recipe.difficulty || "Medium",
                        cookTime: recipe.cookTime || recipe.cook_time || 30,
                        author: { id: recipe.author?.id ?? recipe.authorId ?? recipe.author_id ?? null, displayName: recipe.authorName || recipe.author?.displayName || recipe.author?.name || 'Chef', profile: { url: recipe.author?.profile?.url || null } },
                        reactions: recipe.reactionsCount || recipe.reactions || 0,
                        comments: recipe.commentsCount || 0,
                      }));
                      formatted.sort((a: any, b: any) => (b.reactions || 0) - (a.reactions || 0));
                      setSearchResults(formatted);
                      setSearchPage(pageIndex + 1);
                    } catch (e) {
                      console.error('Prev page failed', e);
                    } finally { setSearchLoading(false); }
                  }}>Prev</Button>

                  <Button disabled={searchPage >= (searchTotalPages || 1)} onClick={async () => {
                    const pageIndex = Math.max(0, searchPage);
                    try {
                      setSearchLoading(true);
                      const resp = await getCachedFilteredRecipes({ searchTerm, page: pageIndex, size: 16 });
                      const content = resp?.data?.content ?? resp?.content ?? resp?.data ?? [];
                      const formatted = (Array.isArray(content) ? content : []).map((recipe: any) => ({
                        id: recipe.id,
                        title: recipe.title,
                        image: recipe.media?.[0]?.url || recipe.image || `https://placehold.co/400x300/e2e8f0/64748b?text=${encodeURIComponent(String(recipe.title || 'Recipe'))}`,
                        cuisine: recipe.cuisine || "International",
                        difficulty: recipe.difficulty || "Medium",
                        cookTime: recipe.cookTime || recipe.cook_time || 30,
                        author: { id: recipe.author?.id ?? recipe.authorId ?? recipe.author_id ?? null, displayName: recipe.authorName || recipe.author?.displayName || recipe.author?.name || 'Chef', profile: { url: recipe.author?.profile?.url || null } },
                        reactions: recipe.reactionsCount || recipe.reactions || 0,
                        comments: recipe.commentsCount || 0,
                      }));
                      formatted.sort((a: any, b: any) => (b.reactions || 0) - (a.reactions || 0));
                      setSearchResults(formatted);
                      setSearchPage(pageIndex + 1);
                    } catch (e) {
                      console.error('Next page failed', e);
                    } finally { setSearchLoading(false); }
                  }}>Next</Button>
                </div>
              </div>
            );
          })()}
        </section>

        {/* Top Chefs Section */}
        <section className="mb-12">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Follow Top Chefs</h2>
              <p className="text-gray-600 mt-1">Connect with renowned chefs and food creators from around the world.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/discover?section=chefs">
                <Button>View All Chefs</Button>
              </Link>
            </div>
          </div>

          <div>
            {loadingChefs ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="h-44 animate-pulse bg-gray-200" />
                ))}
              </div>
            ) : chefs.length === 0 ? (
              <p className="text-gray-600">No top chefs available right now.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {chefs.map((c) => (
                  <ChefCard key={c.id} chef={c} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}

const RecipeCard = ({ recipe }: { recipe: SimpleRecipe }) => {
  return (
    <Link to={`/recipes/${recipe.id}`} className="group">
      <Card className="overflow-hidden hover:shadow-xl transition-shadow cursor-pointer h-full flex flex-col">
        <div className="relative h-40 overflow-hidden bg-gray-200">
          <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
        <div className="p-4 space-y-2 flex-1 flex flex-col">
          <div>
            <p className="text-sm text-orange-600 font-semibold">{recipe.cuisine}</p>
            <h3 className="text-lg font-bold text-gray-900 line-clamp-2">{recipe.title}</h3>
          </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-auto">
                <span>{recipe.cookTime ? `${recipe.cookTime}m` : ''}</span>
                <div className="ml-auto flex items-center gap-2">
                  <img src={typeof recipe.author === 'string' ? `https://i.pravatar.cc/40?u=${recipe.author}` : (recipe.author?.profile?.url || `https://i.pravatar.cc/40?u=${recipe.author?.id || recipe.author?.displayName}`)} alt={typeof recipe.author === 'string' ? String(recipe.author) : recipe.author?.displayName} className="h-5 w-5 rounded-full object-cover" />
                  <span className="truncate">{typeof recipe.author === 'string' ? recipe.author : recipe.author?.displayName}</span>
                </div>
              </div>
        </div>
      </Card>
    </Link>
  );
};

const ChefCard = ({ chef }: { chef: SimpleChef }) => {
  return (
    <Card className="overflow-hidden hover:shadow-xl transition-shadow">
      <div className="relative h-28 bg-gradient-to-r from-orange-400 to-red-500">
        <img src={chef.image} alt={chef.name} className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-20 h-20 rounded-full border-4 border-white object-cover" />
      </div>
      <div className="pt-12 pb-6 px-4 text-center">
        <h3 className="text-lg font-bold text-gray-900 mb-1">{chef.name}</h3>
        <p className="text-sm text-gray-600 mb-2">{chef.specialty}</p>
        <div className="flex items-center gap-4 justify-center text-sm text-gray-600">
          <div className="text-center">
            <p className="font-bold text-gray-900">{chef.recipes ?? 0}</p>
            <p>Recipes</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-900">{chef.followers ?? 0}</p>
            <p>Followers</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
