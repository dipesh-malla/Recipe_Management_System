import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SavedRecipes from './SavedRecipes';
import { User, UserPlus, UserCheck, Loader2, Edit, Trash2, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getUserById, getUserRecipes, followUser, unfollowUser, isFollowing, getUserStatByUserId } from '@/lib/api';
import { getCurrentUser } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Recipe {
  id: number;
  title: string;
  description: string;
  imageUrl?: string;
  media?: Array<{ url: string }>;
}

interface UserProfile {
  id: number;
  username: string;
  displayName: string;
  bio?: string;
  profileUrl?: string;
  email?: string;
}

interface UserStats {
  recipesCount: number;
  followersCount: number;
  followingCount: number;
}

const RecipeCard = ({ recipe, onEdit, onDelete }: { recipe: Recipe; onEdit?: any; onDelete?: any }) => {
  const imageUrl = recipe.imageUrl || recipe.media?.[0]?.url || `https://placehold.co/400x300/e2e8f0/64748b?text=${encodeURIComponent(String(recipe.title || 'Recipe'))}`;
  const [imgError, setImgError] = useState(false);
  
  return (
    <Card className="overflow-hidden group relative hover:shadow-lg transition-shadow">
      <Link to={`/recipes/${recipe.id}`}>
        <img 
          src={imgError ? `https://placehold.co/400x300/e2e8f0/64748b?text=${encodeURIComponent(String(recipe.title || 'Recipe'))}` : imageUrl}
          alt={recipe.title} 
          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      </Link>
      <div className="p-4">
        <h3 className="font-bold text-lg truncate">{recipe.title}</h3>
        {recipe.description && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{recipe.description}</p>
        )}
      </div>
      {onEdit && onDelete && (
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="outline" className="bg-white/80 backdrop-blur-sm" onClick={() => onEdit(recipe)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="destructive" onClick={() => onDelete(recipe.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </Card>
  );
};

export default function PublicUserProfile({ userId }: { userId?: number }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [stats, setStats] = useState<UserStats>({ recipesCount: 0, followersCount: 0, followingCount: 0 });
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [profileImgError, setProfileImgError] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const isOwnProfile = currentUser?.id === userId;
  
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    try {
      await (await import('@/lib/api')).deleteRecipe(id);
      setRecipes(prev => prev.filter(r => r.id !== id));
      setStats(prev => ({ ...prev, recipesCount: Math.max(0, (prev.recipesCount || 0) - 1) } as any));
      toast({ title: 'Success', description: 'Recipe deleted' });
    } catch (err) {
      console.error('Error deleting recipe', err);
      toast({ title: 'Error', description: 'Failed to delete recipe', variant: 'destructive' });
    }
  };

  const handleEdit = (recipe: Recipe) => {
    navigate(`/recipes/edit/${recipe.id}`);
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch user details, user stats, and recipes in parallel for faster loading
        const [userResponse, statsResponse, recipesResponse] = await Promise.allSettled([
          getUserById(userId),
          getUserStatByUserId(userId),
          getUserRecipes(userId, 0, 12), // Limit to 12 recipes initially
        ]);

        // Handle user data
        if (userResponse.status === 'fulfilled' && userResponse.value.success && userResponse.value.data) {
          setUser(userResponse.value.data);
        }

        // Handle user stats
        if (statsResponse.status === 'fulfilled' && statsResponse.value.success && statsResponse.value.data) {
          setStats({
            recipesCount: statsResponse.value.data.recipeCount || 0,
            followersCount: statsResponse.value.data.followersCount || 0,
            followingCount: statsResponse.value.data.followingCount || 0,
          });
        }

        // Handle recipes data
        if (recipesResponse.status === 'fulfilled' && recipesResponse.value.success && recipesResponse.value.data) {
          const raw = Array.isArray(recipesResponse.value.data) ? recipesResponse.value.data : (recipesResponse.value.data.content || []);
          const recipesArray = (raw || []).map((r: any) => ({
            id: r.id ?? r.recipeId ?? r.id,
            title: r.title ?? r.name ?? r.recipeTitle ?? 'Untitled',
            description: r.description ?? r.summary ?? r.shortDescription ?? '',
            imageUrl: r.image || r.imageUrl || (r.media ? (Array.isArray(r.media) ? r.media[0]?.url : undefined) : undefined) || null,
            media: r.media ?? (r.images ? (Array.isArray(r.images) ? r.images.map((u: any) => ({ url: u })) : undefined) : undefined),
          }));
          setRecipes(recipesArray);
          
          // Update recipes count from actual recipe data if stats failed
          if (statsResponse.status === 'rejected' || !statsResponse.value?.success) {
            setStats(prev => ({ ...prev, recipesCount: recipesArray.length }));
          }
        }

        // Check follow status asynchronously (don't block UI)
        if (currentUser && currentUser.id !== userId) {
          isFollowing(currentUser.id, userId)
            .then(followStatus => setFollowing(followStatus.data || false))
            .catch(() => setFollowing(false));
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load user profile',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
    // listen for follow changes to refresh stats if this profile is affected
    const onFollowChanged = async (e: Event) => {
      try {
        const ev: any = (e as CustomEvent).detail;
        if (!ev) return;
        const { followerId, followeeId, action } = ev;
        if (!userId) return;

        // If the event contains the server follow DTO, prefer to update locally for snappy UX
        if (followeeId === userId) {
          if (action === 'follow') {
            setStats(prev => ({ ...prev, followersCount: (prev.followersCount || 0) + 1 }));
          } else if (action === 'unfollow') {
            setStats(prev => ({ ...prev, followersCount: Math.max(0, (prev.followersCount || 0) - 1) }));
          }
        }

        if (followerId === userId) {
          if (action === 'follow') {
            setStats(prev => ({ ...prev, followingCount: (prev.followingCount || 0) + 1 }));
          } else if (action === 'unfollow') {
            setStats(prev => ({ ...prev, followingCount: Math.max(0, (prev.followingCount || 0) - 1) }));
          }
        }

        // Refresh follow status for the viewing user (if not own profile)
        if (currentUser && currentUser.id !== userId) {
          try {
            const followStatus = await isFollowing(currentUser.id, userId);
            setFollowing(followStatus?.data || false);
          } catch (err) {}
        }
      } catch (err) {}
    };
    window.addEventListener('follow-changed', onFollowChanged as EventListener);
    return () => window.removeEventListener('follow-changed', onFollowChanged as EventListener);
  }, [userId, currentUser?.id, toast]);

  const handleFollowToggle = async () => {
    if (!currentUser || !userId) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to follow users',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    try {
      setFollowLoading(true);
      
      if (following) {
        await unfollowUser(currentUser.id, userId);
        setFollowing(false);
        setStats(prev => ({ ...prev, followersCount: Math.max(0, prev.followersCount - 1) }));
        toast({
          title: 'Success',
          description: `Unfollowed ${user?.displayName || 'user'}`,
        });
        try { window.dispatchEvent(new CustomEvent('follow-changed', { detail: { followerId: currentUser.id, followeeId: userId, action: 'unfollow' } })); } catch (e) {}
      } else {
        try {
          await followUser(currentUser.id, userId);
          setFollowing(true);
          setStats(prev => ({ ...prev, followersCount: prev.followersCount + 1 }));
          toast({
            title: 'Success',
            description: `Now following ${user?.displayName || 'user'}`,
          });
          try { window.dispatchEvent(new CustomEvent('follow-changed', { detail: { followerId: currentUser.id, followeeId: userId, action: 'follow' } })); } catch (e) {}
        } catch (err: any) {
          const msg = String(err?.message || '').toLowerCase();
          if (msg.includes('already following') || msg.includes('409') || msg.includes('alreadyfollow')) {
            // idempotent: treat as followed
            setFollowing(true);
            setStats(prev => ({ ...prev, followersCount: prev.followersCount + 1 }));
            try { window.dispatchEvent(new CustomEvent('follow-changed', { detail: { followerId: currentUser.id, followeeId: userId, action: 'follow' } })); } catch (e) {}
          } else {
            throw err;
          }
        }
      }
    } catch (error: any) {
      console.error('Error toggling follow:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update follow status',
        variant: 'destructive',
      });
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        {/* Profile Header Skeleton */}
        <Card className="p-8 mb-6 animate-pulse">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="h-32 w-32 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-4">
              <div className="h-8 bg-gray-200 rounded w-48" />
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-4 bg-gray-200 rounded w-full max-w-md" />
              <div className="flex gap-8 mt-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-6 bg-gray-200 rounded w-12" />
                    <div className="h-4 bg-gray-200 rounded w-16" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Recipes Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-200" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-8 text-center">
          <User className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
          <p className="text-gray-600 mb-4">The user you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </Card>
      </div>
    );
  }

  const displayStats = {
    recipesCount: (recipes?.length) || (stats?.recipesCount ?? stats?.recipeCount ?? 0),
    followersCount: stats?.followersCount ?? stats?.followers ?? 0,
    followingCount: stats?.followingCount ?? stats?.following ?? 0,
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Profile Header */}
      <Card className="p-8 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="relative">
            {(() => {
              const name = String(user.displayName || 'User');
              const username = String(user.username || '').toLowerCase();
              const isKaran = name.toLowerCase().includes('karan bista') || username === 'user84' || username === 'karan';
              const karanAvatar = 'https://i.pravatar.cc/150?u=karan_bista&img=3';
              const fallback = 'https://i.pravatar.cc/150?u=' + encodeURIComponent(username || name);
              const src = profileImgError ? fallback : (user.profileUrl || (isKaran ? karanAvatar : fallback));
              return (
                <img
                  src={src}
                  alt={user.displayName}
                  className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-lg"
                  loading="lazy"
                  onError={() => setProfileImgError(true)}
                />
              );
            })()}
          </div>

          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-2">
              <h1 className="text-3xl font-bold">{user.displayName}</h1>
              {!isOwnProfile && currentUser && (
                <Button
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  variant={following ? 'outline' : 'default'}
                  className="w-fit"
                >
                  {followLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : following ? (
                    <UserCheck className="h-4 w-4 mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  {following ? 'Following' : 'Follow'}
                </Button>
              )}
              {isOwnProfile && (
                <Button
                  onClick={() => navigate('/profile')}
                  variant="outline"
                  className="w-fit"
                >
                  Edit Profile
                </Button>
              )}
            </div>
            <p className="text-gray-600 mb-2">@{user.username}</p>
            {user.bio && <p className="text-gray-700 mb-4">{user.bio}</p>}

            <div className="flex gap-8 mt-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{displayStats.recipesCount}</p>
                <p className="text-sm text-gray-600">Recipes</p>
              </div>
              <div className="text-center cursor-pointer hover:opacity-70">
                <p className="text-2xl font-bold">{displayStats.followersCount}</p>
                <p className="text-sm text-gray-600">Followers</p>
              </div>
              <div className="text-center cursor-pointer hover:opacity-70">
                <p className="text-2xl font-bold">{displayStats.followingCount}</p>
                <p className="text-sm text-gray-600">Following</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Recipes Section */}
      <Tabs defaultValue="recipes" className="w-full">
        <TabsList className={`grid w-full ${isOwnProfile ? 'grid-cols-2' : 'grid-cols-1'} max-w-md mx-auto`}>
          <TabsTrigger value="recipes">Recipes ({recipes.length})</TabsTrigger>
          {isOwnProfile && <TabsTrigger value="saved">Saved</TabsTrigger>}
        </TabsList>

        <TabsContent value="recipes" className="mt-6">
          {recipes.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-600">
                {isOwnProfile ? "You haven't created any recipes yet." : "This user hasn't created any recipes yet."}
              </p>
              {isOwnProfile && (
                <Button className="mt-4" onClick={() => navigate('/create-recipe')}>
                  Create Your First Recipe
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} onEdit={isOwnProfile ? handleEdit : undefined} onDelete={isOwnProfile ? handleDelete : undefined} />
              ))}
            </div>
          )}
        </TabsContent>
        {isOwnProfile && (
          <TabsContent value="saved" className="mt-6">
            <SavedRecipes userId={userId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
