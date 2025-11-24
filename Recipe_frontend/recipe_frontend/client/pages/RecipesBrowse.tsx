import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Clock,
  ChefHat,
  Heart,
  MessageCircle,
  Share2,
  Filter,
  PlusCircle,
  Sparkles
} from "lucide-react";
import { useState, useEffect } from "react";
import { getRecipeRecommendationsPost, getCachedFilteredRecipes } from "@/lib/api";

interface Recipe {
  id: number;
  title: string;
  image: string;
  cuisine: string;
  difficulty?: string;
  cookTime: number;
  author: string;
  reactions: number;
  comments: number;
}

const allRecipesData = Array.from({ length: 24 }, (_, i) => ({
  id: i + 1,
  title: [
    "Classic Spaghetti Carbonara",
    "Authentic Thai Green Curry",
    "Japanese Ramen Masterclass",
    "Mediterranean Quinoa Bowl",
    "Gourmet Beef Bourguignon",
    "Vegan Buddha Bowl",
  ][i % 6],
  image: [
    "https://placehold.co/400x300/fecaca/991b1b?text=Spaghetti",
    "https://placehold.co/400x300/bfdbfe/1e40af?text=Thai+Curry",
    "https://placehold.co/400x300/fde68a/ca8a04?text=Ramen",
    "https://placehold.co/400x300/bbf7d0/15803d?text=Greek+Salad",
    "https://placehold.co/400x300/ddd6fe/6d28d9?text=Quiche",
    "https://placehold.co/400x300/fbcfe8/be185d?text=Buddha+Bowl",
  ][i % 6],
  cuisine: ["Italian", "Thai", "Japanese", "Mediterranean", "French", "Fusion"][ i % 6 ],
  difficulty: ["Easy", "Medium", "Hard"][i % 3],
  cookTime: 15 + (i % 3) * 30,
  author: ["Chef Marco", "Chef Priya", "Chef Takeshi", "Chef Sofia"][i % 4],
  reactions: Math.floor(Math.random() * 600),
  comments: Math.floor(Math.random() * 150),
}));

import { getCurrentUser } from "@/lib/api";
const staticRecommendedRecipes: Recipe[] = [
    {
        id: 1,
        title: "Classic Spaghetti Carbonara",
        image: "https://placehold.co/800x600/fecaca/991b1b?text=Spaghetti+Carbonara",
        cuisine: "Italian",
        difficulty: "Easy",
        cookTime: 25,
        author: "Chef Marco",
        reactions: 452,
        comments: 2,
    },
    {
        id: 2,
        title: "Authentic Thai Green Curry",
        image: "https://placehold.co/800x600/bfdbfe/1e40af?text=Thai+Green+Curry",
        cuisine: "Thai",
        difficulty: "Medium",
        cookTime: 30,
        author: "Chef Priya",
        reactions: 580,
        comments: 0,
    },
    {
        id: 3,
        title: "Japanese Ramen Masterclass",
        image: "https://placehold.co/800x600/fde68a/ca8a04?text=Japanese+Ramen",
        cuisine: "Japanese",
        difficulty: "Hard",
        cookTime: 720,
        author: "Chef Takeshi",
        reactions: 890,
        comments: 0,
    },
];

export default function RecipesBrowse() {
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
    const [allRecipesPage, setAllRecipesPage] = useState(1);
    const ALL_RECIPES_PER_PAGE = 16;
    const [totalRecipes, setTotalRecipes] = useState(0);
  const [recommendedRecipes, setRecommendedRecipes] = useState<Recipe[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);
  const [recommendationPage, setRecommendationPage] = useState(1);
  const RECOMMENDATIONS_PER_PAGE = 4;
  const [searchTerm, setSearchTerm] = useState("");
  const [cuisine, setCuisine] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [maxCookTime, setMaxCookTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const formatRecipe = (recipe: any, index?: number): Recipe => ({
    id: recipe.id || recipe.recipe_id || index || Math.random(),
    title: recipe.title || recipe.name || `Recipe ${recipe.id || recipe.recipe_id || index}`,
    image: recipe.media?.[0]?.url || recipe.image || "https://placehold.co/400x300/e2e8f0/64748b?text=Recipe+Image",
    cuisine: recipe.cuisine,
    difficulty: recipe.difficulty,
    cookTime: recipe.cookTime || recipe.cook_time,
    author: recipe.authorName || recipe.author?.displayName || recipe.author?.name || recipe.author || recipe.chef || 'Unknown Chef',
    reactions: recipe.reactionsCount ?? recipe.reactions ?? recipe.likes ?? 0,
    comments: recipe.commentsCount ?? (Array.isArray(recipe.comments) ? recipe.comments.length : 0),
  });

  // Server-side filtering: call backend when filters, search or page changes
  useEffect(() => {
    const pageToFetch = allRecipesPage - 1; // backend expects 0-based page
    const maxTime = maxCookTime ? parseInt(maxCookTime, 10) : undefined;
    const fetchPage = async () => {
      try {
        const resp = await getCachedFilteredRecipes({
          cuisine,
          difficulty,
          maxCookTime: isNaN(Number(maxTime)) ? undefined : maxTime,
          searchTerm,
          page: pageToFetch,
          size: ALL_RECIPES_PER_PAGE,
        });

        const content = resp?.data?.content || resp?.data || [];
        const formatted = (content || []).map((r: any, idx: number) => formatRecipe(r, idx));
        setAllRecipes(formatted);
        setFilteredRecipes(formatted);
        setTotalRecipes(resp?.data?.totalElements ?? formatted.length);
      } catch (err: any) {
        setError(`Failed to fetch recipes from API: ${err.message}. Displaying demo data.`);
      }
    };

    fetchPage();
  }, [searchTerm, cuisine, difficulty, maxCookTime, allRecipesPage]);

  // Keep a lightweight fetch helper if needed elsewhere
  const fetchApiData = async (page = 1) => {
    const pageToFetch = page - 1;
    try {
      const resp = await getCachedFilteredRecipes({ page: pageToFetch, size: ALL_RECIPES_PER_PAGE });
      const content = respgi?.data?.content || resp?.data || [];
      const formatted = (content || []).map((r: any, index: number) => formatRecipe(r, index));
      setAllRecipes(formatted);
      setFilteredRecipes(formatted);
      setTotalRecipes(resp?.data?.totalElements ?? formatted.length);
    } catch (err: any) {
      setError(`Failed to fetch recipes from API: ${err.message}. Displaying demo data.`);
    }
  };

  useEffect(() => {
    const fetchRecommendations = async () => {
      setIsLoadingRecommendations(true);
      const currentUser = getCurrentUser();
      if (!currentUser) {
        setRecommendedRecipes([]);
        setIsLoadingRecommendations(false);
        return;
      }
      try {
        const userId = currentUser.id;
        // Fetch 100 recommendations for the user
        console.log('Fetching recommendations for user:', userId);
        const response = await getRecipeRecommendationsPost({ user_id: userId, top_k: 100 });
        console.log('Raw recommendations response:', response);
        // For each recommended recipe, fetch full details using recipe_id
        const recDetails = await Promise.all(
          response.recommendations.map(async (rec: any) => {
            try {
              const detailResp = await getRecipeById(rec.recipe_id || rec.id);
              console.log('Fetched details for recipe:', rec.recipe_id || rec.id, detailResp.data);
              const d = detailResp.data;
              return formatRecipe(d);
            } catch (err) {
              console.warn('Failed to fetch details for recipe:', rec.recipe_id || rec.id, err);
              // fallback to minimal rec info if detail fetch fails
              return formatRecipe(rec);
            }
          })
        );
        console.log('Final recommendedRecipes:', recDetails);
        setRecommendedRecipes(recDetails);
      } catch (err: any) {
        console.error("Failed to fetch recommendations:", err);
        setRecommendedRecipes(staticRecommendedRecipes.map((rec, index) => formatRecipe(rec, index)));
      } finally {
        setIsLoadingRecommendations(false);
      }
    };
    // initial data fetch is handled by the filter effect above
    // but keep a call for compatibility
    fetchApiData(allRecipesPage);
    fetchRecommendations();
  }, []);

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Explore Recipes</h1>
                <Button onClick={() => navigate('/create-recipe')} className="gap-2">
                    <PlusCircle className="h-5 w-5"/>
                    Create Recipe
                </Button>
            </div>
            {error && <p className="text-red-500 bg-red-100 p-3 rounded-lg mb-4">Error: {error}</p>}

            <div className="space-y-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search recipes by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-2 rounded-lg bg-gray-50 border-gray-300"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-700">Filter By:</span>
                </div>
                <Select value={cuisine} onValueChange={setCuisine}>
                  <SelectTrigger className="w-full sm:w-48 rounded-lg"><SelectValue placeholder="Cuisine" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cuisines</SelectItem>
                    <SelectItem value="Italian">Italian</SelectItem>
                    <SelectItem value="Thai">Thai</SelectItem>
                    <SelectItem value="Japanese">Japanese</SelectItem>
                    <SelectItem value="Mediterranean">Mediterranean</SelectItem>
                    <SelectItem value="French">French</SelectItem>
                    <SelectItem value="Fusion">Fusion</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="w-full sm:w-48 rounded-lg"><SelectValue placeholder="Difficulty" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
                 <Input
                    type="number"
                    placeholder="Max Cook Time (min)"
                    value={maxCookTime}
                    onChange={(e) => setMaxCookTime(e.target.value)}
                    className="w-full sm:w-48 rounded-lg bg-gray-50 border-gray-300"
                  />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-orange-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-orange-500" />
              Recommended For You
            </h2>
            {isLoadingRecommendations ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(RECOMMENDATIONS_PER_PAGE)].map((_, i) => (
                  <Card key={i} className="h-48 animate-pulse bg-gray-200" />
                ))}
              </div>
            ) : !getCurrentUser() ? (
              <div className="p-6 bg-white rounded-lg shadow text-center">
                <p className="text-orange-600 font-semibold text-lg mb-2">Sign in to get personalized recipe recommendations!</p>
                <Link to="/login">
                  <Button className="bg-orange-500 text-white">Sign In</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {recommendedRecipes
                    .slice((recommendationPage - 1) * RECOMMENDATIONS_PER_PAGE, recommendationPage * RECOMMENDATIONS_PER_PAGE)
                    .map((recipe) => (
                      <RecipeCard key={`rec-${recipe.id}`} recipe={recipe} />
                    ))}
                </div>
                {/* Pagination controls for recommendations */}
                {recommendedRecipes.length > RECOMMENDATIONS_PER_PAGE && (
                  <div className="flex justify-center mt-6 gap-2">
                    <Button
                      variant="outline"
                      disabled={recommendationPage === 1}
                      onClick={() => setRecommendationPage(recommendationPage - 1)}
                    >
                      Previous
                    </Button>
                    <span className="px-4 py-2 text-gray-700 font-semibold">Page {recommendationPage} of {Math.ceil(recommendedRecipes.length / RECOMMENDATIONS_PER_PAGE)}</span>
                    <Button
                      variant="outline"
                      disabled={recommendationPage === Math.ceil(recommendedRecipes.length / RECOMMENDATIONS_PER_PAGE)}
                      onClick={() => setRecommendationPage(recommendationPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">All Recipes</h2>
            <p className="text-gray-600 mb-8">
              Showing {filteredRecipes.length} recipes on this page — {totalRecipes} total.
            </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
          </div>

            {totalRecipes > ALL_RECIPES_PER_PAGE && (
              <div className="flex justify-center mt-6 gap-2">
                <Button
                  variant="outline"
                  disabled={allRecipesPage === 1}
                  onClick={() => {
                    setAllRecipesPage(allRecipesPage - 1);
                    fetchApiData(allRecipesPage - 1);
                  }}
                >
                  Previous
                </Button>
                <span className="px-4 py-2 text-gray-700 font-semibold">Page {allRecipesPage} of {Math.ceil(totalRecipes / ALL_RECIPES_PER_PAGE)}</span>
                <Button
                  variant="outline"
                  disabled={allRecipesPage === Math.ceil(totalRecipes / ALL_RECIPES_PER_PAGE)}
                  onClick={() => {
                    setAllRecipesPage(allRecipesPage + 1);
                    fetchApiData(allRecipesPage + 1);
                  }}
                >
                  Next
                </Button>
              </div>
            )}
            
          {filteredRecipes.length > ALL_RECIPES_PER_PAGE && (
            <div className="flex justify-center mt-6 gap-2">
              <Button
                variant="outline"
                disabled={allRecipesPage === 1}
                onClick={() => setAllRecipesPage(allRecipesPage - 1)}
              >
                Previous
              </Button>
              <span className="px-4 py-2 text-gray-700 font-semibold">Page {allRecipesPage} of {Math.ceil(filteredRecipes.length / ALL_RECIPES_PER_PAGE)}</span>
              <Button
                variant="outline"
                disabled={allRecipesPage === Math.ceil(filteredRecipes.length / ALL_RECIPES_PER_PAGE)}
                onClick={() => setAllRecipesPage(allRecipesPage + 1)}
              >
                Next
              </Button>
            </div>
          )}

          {filteredRecipes.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-600 mb-4">No recipes found. Try adjusting your filters.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setCuisine("all");
                  setDifficulty("all");
                  setMaxCookTime("");
                }}
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

const RecipeCard = ({ recipe }: { recipe: Recipe }) => (
    <Link to={`/recipe/${recipe.id}`}>
        <Card className="overflow-hidden hover:shadow-xl transition-shadow cursor-pointer h-full flex flex-col group">
        <div className="relative h-48 overflow-hidden bg-gray-200">
            <img
            src={recipe.image}
            alt={recipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-3 right-3 flex gap-2">
                <Badge className="bg-orange-500 text-white">{recipe.difficulty}</Badge>
            </div>
        </div>

        <div className="p-4 space-y-3 flex-1 flex flex-col">
            <div>
                <p className="text-sm text-orange-600 font-semibold">{recipe.cuisine}</p>
                <h3 className="text-lg font-bold text-gray-900 line-clamp-2 h-14">{recipe.title}</h3>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 pt-2">
                <div className="flex items-center gap-1"><Clock className="h-4 w-4" /> {recipe.cookTime}m</div>
                <div className="flex items-center gap-1 truncate"><ChefHat className="h-4 w-4" /> {recipe.author}</div>
            </div>

            <div className="flex items-center gap-3 text-gray-600 border-t pt-3 mt-auto">
                <div className="flex items-center gap-1"><Heart className="h-4 w-4" /> <span className="text-sm">{recipe.reactions}</span></div>
                <div className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> <span className="text-sm">{recipe.comments}</span></div>
                <div className="flex items-center gap-1 ml-auto"><Share2 className="h-4 w-4" /></div>
            </div>
        </div>
        </Card>
    </Link>
)
