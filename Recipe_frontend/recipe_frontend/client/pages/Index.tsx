import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MainLayout from "@/components/MainLayout";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { getAllRecipes } from "@/lib/api";
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
  const [stats, setStats] = useState({
    totalRecipes: 0,
    totalUsers: 0,
    totalCommunity: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDynamicData();
  }, []);

  const fetchDynamicData = async () => {
    try {
      setIsLoading(true);

      // Fetch only 6 recipes for landing page (optimized)
      const recipesResponse = await getAllRecipes(0, 6, "createdDate", "DESC");
      const recipes = recipesResponse.data?.content || recipesResponse.data || [];
      
      const formattedRecipes = recipes
        .map((recipe: any) => ({
          id: recipe.id,
          title: recipe.title,
          image: recipe.media?.[0]?.url || "https://placehold.co/400x300/e2e8f0/64748b?text=Recipe+Image",
          cuisine: recipe.cuisine || "International",
          difficulty: recipe.difficulty || "Medium",
          cookTime: recipe.cookTime || 30,
          author: recipe.author?.displayName || "Chef",
          reactions: recipe.reactionsCount || 0,
          comments: recipe.commentsCount || 0,
        }));

      setFeaturedRecipes(formattedRecipes);

      // Use static data for chefs to avoid slow API call
      // In production, you'd want a paginated /users endpoint
      const staticChefs = [
        {
          id: 1,
          name: "Chef Marco",
          specialty: "Italian Cuisine",
          followers: 15240,
          recipes: 48,
          image: "https://placehold.co/150x150/fecaca/991b1b?text=Chef+M",
        },
        {
          id: 2,
          name: "Chef Priya",
          specialty: "Indian & Fusion",
          followers: 12850,
          recipes: 62,
          image: "https://placehold.co/150x150/bfdbfe/1e40af?text=Chef+P",
        },
        {
          id: 3,
          name: "Chef Takeshi",
          specialty: "Japanese Cuisine",
          followers: 18900,
          recipes: 74,
          image: "https://placehold.co/150x150/fde68a/ca8a04?text=Chef+T",
        },
        {
          id: 4,
          name: "Chef Sofia",
          specialty: "Mediterranean",
          followers: 11240,
          recipes: 55,
          image: "https://placehold.co/150x150/bbf7d0/15803d?text=Chef+S",
        },
      ];

      setTrendingChefs(staticChefs);

      // Set approximate statistics (no need to fetch all data)
      const totalRecipesFromPage = recipesResponse.data?.totalElements || recipes.length;
      setStats({
        totalRecipes: totalRecipesFromPage > 0 ? totalRecipesFromPage : 50,
        totalUsers: 25,
        totalCommunity: 500,
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
                <Link to="/recipes">
                  <Button className="rounded-full bg-white text-orange-600 hover:bg-gray-100 font-semibold px-8 py-6 text-lg">
                    Explore Recipes
                  </Button>
                </Link>
                <Link to="/register">
                  <Button
                    variant="outline"
                    className="rounded-full border-white text-white hover:bg-white/20 font-semibold px-8 py-6 text-lg"
                  >
                    Start Sharing
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap gap-8 pt-4">
                <div>
                  <div className="text-3xl font-bold">{stats.totalRecipes > 0 ? `${Math.floor(stats.totalRecipes / 1000)}K+` : '50K+'}</div>
                  <div className="text-orange-100">Recipes</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">{stats.totalUsers > 0 ? `${stats.totalUsers}+` : '25K+'}</div>
                  <div className="text-orange-100">Chefs</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">{stats.totalCommunity > 0 ? `${Math.floor(stats.totalCommunity / 1000)}K+` : '500K+'}</div>
                  <div className="text-orange-100">Community</div>
                </div>
              </div>
            </div>

            <div className="hidden md:block relative">
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://placehold.co/600x600/f97316/ffffff?text=Recipe+Community"
                  alt="Hero food"
                  className="w-full h-full object-cover"
                />
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
                placeholder="Search recipes, cuisines, ingredients..."
                className="pl-12 pr-4 py-3 rounded-lg bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <Button className="rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 px-8">
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 text-orange-500 mx-auto mb-3" />
              <div className="text-3xl font-bold text-gray-900">2M+</div>
              <p className="text-gray-600">Monthly Active Users</p>
            </div>
            <div className="text-center">
              <ChefHat className="h-8 w-8 text-orange-500 mx-auto mb-3" />
              <div className="text-3xl font-bold text-gray-900">25K+</div>
              <p className="text-gray-600">Professional Chefs</p>
            </div>
            <div className="text-center">
              <Heart className="h-8 w-8 text-orange-500 mx-auto mb-3" />
              <div className="text-3xl font-bold text-gray-900">100M+</div>
              <p className="text-gray-600">Recipes Saved</p>
            </div>
            <div className="text-center">
              <Users className="h-8 w-8 text-orange-500 mx-auto mb-3" />
              <div className="text-3xl font-bold text-gray-900">5M+</div>
              <p className="text-gray-600">Daily Interactions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Recipes Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Trending Now
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl">
            Discover the most loved and shared recipes from our vibrant
            community of food enthusiasts.
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
                      <div className="flex items-center gap-1">
                        <ChefHat className="h-4 w-4" />
                        {recipe.author}
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

        <div className="mt-12 text-center">
          <Link to="/recipes">
            <Button
              size="lg"
              className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 px-8"
            >
              View All Recipes
            </Button>
          </Link>
        </div>
      </div>

      {/* Trending Chefs Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Follow Top Chefs
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl">
              Connect with renowned chefs and food creators from around the
              world.
            </p>
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

                  <Link to={`/chefs`}>
                    <Button className="w-full rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600">
                      Follow
                    </Button>
                  </Link>
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

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Ready to Share Your First Recipe?
          </h2>
          <p className="text-lg text-orange-50">
            Join thousands of chefs and food lovers building the world's largest
            recipe community.
          </p>
          <Link to="/register">
            <Button className="rounded-full bg-white text-orange-600 hover:bg-gray-100 font-semibold px-8 py-6 text-lg">
              Get Started Today
            </Button>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
