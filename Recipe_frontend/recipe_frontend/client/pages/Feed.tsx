import MainLayout from "@/components/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, X, Sparkles, TrendingUp, Clock, ChefHat } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { 
  getAllPosts, 
  createOrUpdatePost, 
  getRecipeRecommendationsGet, 
  getCurrentUser,
  getAllRecipes
} from "@/lib/api";
import Post from "@/components/Post";
import { Post as PostType } from "@shared/api";
import { staticFeedData } from "../staticFeedData";

interface Recipe {
  recipe_id: number;
  title: string;
  score?: number;
  reason?: string;
  cuisine?: string;
  dietary_type?: string;
  cook_time?: number;
  difficulty?: string;
  calories_per_serving?: number;
  avg_rating?: number;
  chef?: string;
  likes?: number;
  comments?: number;
  image?: string;
}

export default function Feed() {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [recommendedRecipes, setRecommendedRecipes] = useState<Recipe[]>([]);
  const [trendingRecipes, setTrendingRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const currentUser = getCurrentUser();

  const fetchPosts = async () => {
    try {
      const response = await getAllPosts();
      const formattedPosts = response.data.map((post: any) => ({
        id: post.id,
        author: {
          id: post.author.id,
          displayName: post.author.displayName,
          profile: post.author.profile,
        },
        contentText: post.contentText,
        media: post.medias,
        reactionsCount: post.reactionsCount,
        comments: post.comments || [],
        createdDate: new Date(post.createdDate).toISOString(),
      }));
      setPosts(formattedPosts);
    } catch (err: any) {
      setError(err.message);
      setPosts(staticFeedData);
    }
  }

  const fetchRecommendations = async () => {
    setIsLoadingRecommendations(true);
    try {
      // Try to get personalized recommendations from ML backend
      if (currentUser?.id) {
        const mlResponse = await getRecipeRecommendationsGet(currentUser.id, 50);
        if (mlResponse?.recommendations) {
          // Use the backend JSON structure directly
          setRecommendedRecipes(mlResponse.recommendations);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch ML recommendations:", err);
      // Fallback to showing trending recipes from database
      try {
        const recipesResponse = await getAllRecipes(0, 50); // Get first 50 recipes
        const recipes = recipesResponse.data?.content || recipesResponse.data || [];
        const topRecipes = recipes.slice(0, 50).map((recipe: any, index: number) => ({
          recipe_id: recipe.recipe_id || recipe.id || `recipe-${index}`,
          title: recipe.title,
          cuisine: recipe.cuisine,
          dietary_type: recipe.dietary_type,
          cook_time: recipe.cook_time || recipe.cookTime,
          difficulty: recipe.difficulty,
          calories_per_serving: recipe.calories_per_serving,
          avg_rating: recipe.avg_rating,
          chef: recipe.chef || recipe.author?.displayName || recipe.author || "Unknown Chef",
          likes: recipe.likes ?? recipe.like_count ?? 0,
          comments: recipe.comments ?? recipe.comment_count ?? 0,
          image: recipe.media?.[0]?.url || recipe.image || "https://placehold.co/400x300/e2e8f0/64748b?text=Recipe+Image",
        }));
        setRecommendedRecipes(topRecipes);
      } catch (err2: any) {
        console.error("Failed to fetch recipes:", err2);
      }
    } finally {
      setIsLoadingRecommendations(false);
    }
  }

  const fetchTrendingRecipes = async () => {
    try {
      const response = await getAllRecipes(0, 20); // Get first 20 recipes for trending
      // Get top 3 trending recipes (sorted by engagement)
      const recipes = response.data?.content || response.data || [];
      const trending = recipes
        .sort((a: any, b: any) => (b.reactionsCount || 0) - (a.reactionsCount || 0))
        .slice(0, 3)
        .map((recipe: any, index: number) => ({
          recipe_id: recipe.recipe_id || recipe.id || `trending-${index}`,
          title: recipe.title,
          image: recipe.media?.[0]?.url || recipe.image || "https://placehold.co/400x300/e2e8f0/64748b?text=Recipe+Image",
          cuisine: recipe.cuisine,
          difficulty: recipe.difficulty,
          cook_time: recipe.cook_time || recipe.cookTime,
          chef: recipe.chef || recipe.author?.displayName || recipe.author || "Unknown Chef",
        }));
      setTrendingRecipes(trending);
    } catch (err: any) {
      console.error("Failed to fetch trending recipes:", err);
    }
  }

  useEffect(() => {
    fetchPosts();
    fetchRecommendations();
    fetchTrendingRecipes();
  }, []);

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    try {
      await createOrUpdatePost({ contentText: newPostContent }, newPostImage ? [newPostImage] : undefined);
      setNewPostContent("");
      setNewPostImage(null);
      fetchPosts();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <MainLayout>
      <div className="relative min-h-screen bg-gray-50">
        {/* ML-Powered Recommendations Section */}
        {recommendedRecipes.length > 0 && (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-orange-500" />
                  Recommended For You
                  <Badge className="ml-2 bg-orange-500 text-white">AI Powered</Badge>
                </h2>
                <Link to="/recipes">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </div>

              {isLoadingRecommendations ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="h-48 animate-pulse bg-gray-200" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {recommendedRecipes.map((recipe) => (
                    <Link key={recipe.recipe_id} to={`/recipe/${recipe.recipe_id}`}> 
                      <Card className="group cursor-pointer hover:shadow-lg transition-all overflow-hidden h-full">
                        <div className="relative h-32 overflow-hidden">
                          <img
                            src={recipe.image || "https://placehold.co/400x300/e2e8f0/64748b?text=Recipe+Image"}
                            alt={recipe.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          {recipe.difficulty && (
                            <Badge className="absolute top-2 right-2 bg-white/90 text-gray-900 text-xs">
                              {recipe.difficulty}
                            </Badge>
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="font-semibold text-sm line-clamp-2 text-gray-900 mb-1">{recipe.title}</h3>
                          {recipe.cuisine && (
                            <p className="text-xs text-orange-600 font-medium">{recipe.cuisine}</p>
                          )}
                          {recipe.cook_time && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                              <Clock className="h-3 w-3" />
                              {recipe.cook_time}m
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <ChefHat className="h-3 w-3" />
                            {recipe.chef && recipe.chef.trim() !== "" ? recipe.chef : "Unknown Chef"}
                            <span className="ml-2">👍 {recipe.likes}</span>
                            <span className="ml-2">💬 {recipe.comments}</span>
                          </div>
                          {recipe.score !== undefined && (
                            <div className="text-xs text-gray-400 mt-1">Score: {recipe.score.toFixed(3)}</div>
                          )}
                          {recipe.reason && (
                            <div className="text-xs text-gray-400 mt-1">Reason: {recipe.reason}</div>
                          )}
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Feed Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Feed - Posts */}
            <div className="lg:col-span-2 space-y-6">
              <h1 className="text-3xl font-bold text-gray-900">Community Feed</h1>

              {error && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ {error}. Showing demo data.
                  </p>
                </div>
              )}

              {/* Posts */}
              <div className="space-y-6">
                {posts.length > 0 ? (
                  posts.map((post) => <Post key={post.id} post={post} />)
                ) : (
                  <Card className="p-12 text-center">
                    <p className="text-gray-500">No posts yet. Be the first to share something!</p>
                  </Card>
                )}
              </div>
            </div>

            {/* Sidebar - Trending & Quick Actions */}
            <div className="space-y-6">
              {/* Trending Recipes */}
              {trendingRecipes.length > 0 && (
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-5 w-5 text-orange-500" />
                    <h2 className="text-lg font-bold text-gray-900">Trending Recipes</h2>
                  </div>
                  <div className="space-y-4">
                    {trendingRecipes.map((recipe) => (
                      <Link key={recipe.recipe_id} to={`/recipe/${recipe.recipe_id}`}>
                        <div className="flex gap-3 group cursor-pointer">
                          <img
                            src={recipe.image}
                            alt={recipe.title}
                            className="w-20 h-20 rounded-lg object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm line-clamp-2 text-gray-900 group-hover:text-orange-600 transition-colors">
                              {recipe.title}
                            </h3>
                            {recipe.chef && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                <ChefHat className="h-3 w-3" />
                                {recipe.chef}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </Card>
              )}

              {/* Quick Actions */}
              <Card className="p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
                <div className="space-y-2">
                  <Link to="/recipes">
                    <Button variant="outline" className="w-full justify-start">
                      Browse All Recipes
                    </Button>
                  </Link>
                  <Link to="/create-recipe">
                    <Button variant="outline" className="w-full justify-start">
                      Create Recipe
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Floating Create Post Card */}
        <div className="sticky bottom-0 right-0 p-4 lg:p-8 flex justify-center lg:justify-end">
          <Card className="w-full max-w-2xl p-4 shadow-2xl bg-white/95 backdrop-blur-sm border-gray-300">
            <div className="flex gap-4">
              <img
                src={currentUser?.profile?.url || "https://placehold.co/100x100/94a3b8/ffffff?text=User"}
                alt="Your avatar"
                className="h-12 w-12 rounded-full object-cover"
              />
              <div className="flex-1 space-y-3">
                <Textarea
                  placeholder="What's cooking? Share your latest creation..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                  rows={2}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                />
                {newPostImage && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    <span className="flex-1 truncate">Image: {newPostImage.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setNewPostImage(null)}
                      className="h-6 w-6"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    className="gap-2 text-gray-600 hover:text-orange-600"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <ImageIcon className="h-5 w-5" />
                    <span className="hidden sm:inline">Upload Image</span>
                    <input
                      type="file"
                      ref={imageInputRef}
                      className="hidden"
                      onChange={(e) =>
                        setNewPostImage(e.target.files ? e.target.files[0] : null)
                      }
                      accept="image/*"
                      aria-label="Upload image"
                    />
                  </Button>
                  <Button
                    className="rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
                    onClick={handleCreatePost}
                    disabled={!newPostContent.trim()}
                  >
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
