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
  getCurrentUser,
  getAllRecipes,
  getLatestPosts,
  getPostsPage
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
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [trendingRecipes, setTrendingRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const currentUser = getCurrentUser();

  const fetchPosts = async () => {
    try {
      setLoading(true);
      console.debug("Feed: fetching posts...");

      // Show demo data immediately while the network request runs
      if (!posts || posts.length === 0) {
        setPosts(staticFeedData);
      }

      // request latest 10 posts via filter endpoint
      const response = await getLatestPosts(10);
      console.debug("Feed: raw response from getAllPosts:", response);

      // Normalize response shape used by backend: response.data.data -> paginated DTO
      let raw = response?.data?.data ?? response?.data ?? response;
      let arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);

      // If we didn't find an array yet, attempt to find any nested array in the response object
      const findFirstArray = (obj: any): any[] | null => {
        if (!obj || typeof obj !== "object") return null;
        if (Array.isArray(obj)) return obj;
        for (const k of Object.keys(obj)) {
          const found = findFirstArray(obj[k]);
          if (found) return found;
        }
        return null;
      };

      if (arr.length === 0) {
        const nested = findFirstArray(response);
        if (nested && Array.isArray(nested)) {
          arr = nested;
          console.debug("Feed: extracted nested array from response, length=", arr.length);
        }
      }

      console.debug("Feed: posts array length after normalization:", Array.isArray(arr) ? arr.length : 0);

      const formattedPosts = arr.map((post: any) => {
        const author = post?.author || post?.user || {};
        const medias = post?.medias || post?.mediasDTO || post?.media || post?.mediaDTO || [];
        const created = post?.createdDate || post?.createdAt || post?.created_on || post?.created_date || post?.created || new Date().toISOString();

        return {
          id: post.id,
          author: {
            id: author.id || post?.author_id || post?.created_by,
            displayName: author.displayName || author.name || author.username || `User ${author.id || post?.author_id}`,
            profile: author.profile || (author.profileUrl ? { url: author.profileUrl } : author.avatar ? { url: author.avatar } : undefined),
          },
          contentText: post.contentText || post.content || post.content_text || "",
          media: medias,
          reactionsCount: (post.reactions && post.reactions.length) || post.reactionsCount || post.like_count || post.likeCount || 0,
          comments: post.comments || [],
          commentCount: post.comment_count || post.commentsCount || post.commentCount || 0,
          createdDate: new Date(created).toISOString(),
        };
      });

      if (!formattedPosts || formattedPosts.length === 0) {
        console.warn("Feed: backend returned no posts — keeping demo posts");
      } else {
        // Replace demo posts with real posts once available
        setPosts(formattedPosts);
        setPage(1);
        setHasMore((response?.data?.totalElements ?? 0) > formattedPosts.length);
      }

      setLoading(false);
    } catch (err: any) {
      console.error("Feed: failed to fetch posts", err);
      setError(err.message || String(err));
      // Keep demo data if network error
      setPosts(staticFeedData);
      setLoading(false);
    }
  };

  // Load next page and append
  const fetchMorePosts = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const response = await getPostsPage(page, 30);
      let raw = response?.data?.data ?? response?.data ?? response;
      let arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);

      // Try to find nested array if necessary
      const findFirstArray = (obj: any): any[] | null => {
        if (!obj || typeof obj !== "object") return null;
        if (Array.isArray(obj)) return obj;
        for (const k of Object.keys(obj)) {
          const found = findFirstArray(obj[k]);
          if (found) return found;
        }
        return null;
      };
      if (arr.length === 0) {
        const nested = findFirstArray(response);
        if (nested && Array.isArray(nested)) arr = nested;
      }

      const formatted = arr.map((post: any) => ({
        id: post.id,
        author: post?.author || post?.user || {},
        contentText: post.contentText || post.content || post.content_text || "",
        media: post?.medias || post?.media || [],
        reactionsCount: post.reactionsCount || post.like_count || post.likeCount || 0,
        comments: post.comments || [],
        commentCount: post.comment_count || post.commentsCount || post.commentCount || 0,
        createdDate: post?.createdDate || post?.createdAt || new Date().toISOString(),
      }));

      if (formatted && formatted.length > 0) {
        setPosts((prev) => [...prev, ...formatted]);
        setPage((p) => p + 1);
        setHasMore((response?.data?.totalElements ?? 0) > (page + 1) * 30);
      } else {
        setHasMore(false);
      }
    } catch (err: any) {
      console.error("Feed: failed to fetch more posts", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // sentinel ref for intersection observer
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && hasMore) {
          fetchMorePosts();
        }
      });
    }, { root: null, rootMargin: '400px', threshold: 0.1 });
    obs.observe(sentinel);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentinelRef.current, hasMore]);

  // Create post handler
  const handleCreatePost = async () => {
    try {
      const payload = {
        contentText: newPostContent,
        authorId: currentUser?.id ?? undefined,
        privacy: 'PUBLIC',
        pinned: false,
      } as any;

      await createOrUpdatePost(payload, newPostImage ? [newPostImage] : undefined);
      setNewPostContent("");
      setNewPostImage(null);
      await fetchPosts();
    } catch (err: any) {
      console.error("Feed: create post failed", err);
      setError(err.message || String(err));
    }
  };

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <MainLayout>
      <div className="relative min-h-screen bg-gray-50">
        

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
                {loading ? (
                  <Card className="p-8 text-center">
                    <p className="text-gray-500">Loading posts...</p>
                  </Card>
                ) : posts.length > 0 ? (
                  <>
                    {posts.map((post) => <Post key={post.id} post={post} />)}
                    <div ref={sentinelRef} />
                    {loadingMore && (
                      <Card className="p-4 text-center">
                        <p className="text-gray-500">Loading more posts...</p>
                      </Card>
                    )}
                  </>
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
                      <Link key={recipe.recipe_id} to={`/recipes/${recipe.recipe_id}`}>
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
                  src={currentUser?.profile?.url || `https://i.pravatar.cc/150?u=${currentUser?.id || 'anon'}`}
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
