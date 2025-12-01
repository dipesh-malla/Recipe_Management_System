import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
// Replaced Radix Tabs with a lightweight button-based tabs for reliability
import { Edit, Trash2, PlusCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCurrentUser, getUserById, getUserRecipes, getFollowers, getFollowing, deleteRecipe } from '@/lib/api';
import SavedRecipes from '@/components/SavedRecipes';
import { useToast } from '@/hooks/use-toast';

interface Recipe {
  id: number;
  title: string;
  description: string;
  imageUrl?: string;
  media?: Array<{ url: string }>;
}

interface UserData {
  id: number;
  username: string;
  displayName: string;
  bio?: string;
  profileUrl?: string;
  email?: string;
  stats?: {
    recipeCount: number;
    followersCount: number;
    followingCount: number;
  };
}

interface Follower {
  id: number;
  username: string;
  displayName: string;
  profile: string;
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

const UserCard = ({ user }: { user: Follower }) => (
  <Card className="p-4 flex items-center justify-between hover:shadow-md transition-shadow">
    <Link to={`/profile/${user.id}`} className="flex items-center gap-4 flex-1">
      {(() => {
        const name = String(user.displayName || 'User');
        const username = String(user.username || '').toLowerCase();
        const isKaran = name.toLowerCase().includes('karan bista') || username === 'user84' || username === 'karan';
        const karanAvatar = 'https://i.pravatar.cc/150?u=karan_bista&img=3';
        const src = user.profile || (isKaran ? karanAvatar : `https://i.pravatar.cc/150?u=${encodeURIComponent(username || name)}`);
        return (
          <img src={src} alt={user.displayName} className="h-12 w-12 rounded-full object-cover" loading="lazy" />
        );
      })()}
      <div>
        <p className="font-bold hover:underline">{user.displayName}</p>
        <p className="text-sm text-gray-500">@{user.username}</p>
      </div>
    </Link>
    <Button size="sm" variant="outline">View Profile</Button>
  </Card>
);

export default function UserProfile() {
  const [user, setUser] = useState<UserData | null>(null);
  const [createdRecipes, setCreatedRecipes] = useState<Recipe[]>([]);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [following, setFollowing] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentUser = getCurrentUser();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        
        // Fetch user details and recipes in parallel
        const [userResponse, recipesResponse] = await Promise.allSettled([
          getUserById(currentUser.id),
          getUserRecipes(currentUser.id, 0, 50),
        ]);

        // Handle user data
        if (userResponse.status === 'fulfilled' && userResponse.value.success && userResponse.value.data) {
          setUser(userResponse.value.data);
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
          setCreatedRecipes(recipesArray);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load profile data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
        setLoadingRecipes(false);
      }
    };

    fetchUserProfile();

    // listen for follow/unfollow events happening elsewhere in the app and refresh
    const onFollowChanged = async (e: Event) => {
      try {
        const ev: any = (e as CustomEvent).detail;
        if (!ev) return;
        // If the change affects current user's followers/following, refresh lists and header counts
        if (!currentUser) return;
        const { followerId, followeeId, action } = ev;
        // If someone followed/unfollowed currentUser (they are the followee), refresh followers
        if (followeeId === currentUser.id) {
          // If followers are loaded, update them in-place to avoid a network fetch
          if (action === 'follow') {
            if (ev.follow && ev.follow.follower) {
              const f = ev.follow.follower;
              const newFollower: Follower = {
                id: f.id,
                username: f.username,
                displayName: f.displayName,
                profile: f.profileUrl || (f.profile ? f.profile.url : undefined) || `https://i.pravatar.cc/150?u=${f.username}`,
              };
              setFollowers(prev => {
                if (prev.find(p => p.id === newFollower.id)) return prev;
                return [newFollower, ...prev];
              });
            } else {
              setFollowers([]);
              await fetchFollowersData();
            }
          } else if (action === 'unfollow') {
            setFollowers(prev => prev.filter(p => p.id !== followerId));
          }
        }

        // If currentUser followed/unfollowed someone, refresh following list
        if (followerId === currentUser.id) {
          if (action === 'follow') {
            if (ev.follow && ev.follow.followee) {
              const ff = ev.follow.followee;
              const newFollowing: Follower = {
                id: ff.id,
                username: ff.username,
                displayName: ff.displayName,
                profile: ff.profileUrl || (ff.profile ? ff.profile.url : undefined) || `https://i.pravatar.cc/150?u=${ff.username}`,
              };
              setFollowing(prev => {
                if (prev.find(p => p.id === newFollowing.id)) return prev;
                return [newFollowing, ...prev];
              });
            } else {
              setFollowing([]);
              await fetchFollowingData();
            }
          } else if (action === 'unfollow') {
            setFollowing(prev => prev.filter(p => p.id !== followeeId));
          }
        }

        // Always refresh the user header info to pick up updated counts
        try {
          const resp = await getUserById(currentUser.id);
          if (resp?.success && resp.data) setUser(resp.data);
        } catch (err) {
          // ignore
        }
      } catch (err) {
        // ignore
      }
    };

    window.addEventListener('follow-changed', onFollowChanged as EventListener);
    return () => {
      window.removeEventListener('follow-changed', onFollowChanged as EventListener);
    };
  }, [currentUser, navigate, toast]);

  const fetchFollowersData = async () => {
    if (!currentUser) return;

    try {
      setLoadingFollowers(true);
      const response = await getFollowers(currentUser.id);
      console.debug('fetchFollowersData response:', response);

      // Normalize possible response shapes: { success, data: [...] } or { data: { content: [...] } } or raw array
      let items: any[] = [];
      if (!response) {
        items = [];
      } else if (Array.isArray(response)) {
        items = response;
      } else if (response.success && response.data) {
        items = Array.isArray(response.data) ? response.data : (response.data.content || []);
      } else if (response.data && Array.isArray(response.data)) {
        items = response.data;
      } else if (response.content && Array.isArray(response.content)) {
        items = response.content;
      }

      // Map items to Follower shape defensively
      const mapped = (items || []).map((u: any) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName || u.name || `User ${u.id}`,
        profile: u.profile || u.profileUrl || (u.profile?.url) || `https://i.pravatar.cc/150?u=${u.username}`,
      }));

      setFollowers(mapped);
    } catch (error) {
      console.error('Error fetching followers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load followers',
        variant: 'destructive',
      });
    } finally {
      setLoadingFollowers(false);
    }
  };

  const fetchFollowingData = async () => {
    if (!currentUser) return;

    try {
      setLoadingFollowing(true);
      const response = await getFollowing(currentUser.id);
      console.debug('fetchFollowingData response:', response);

      let items: any[] = [];
      if (!response) {
        items = [];
      } else if (Array.isArray(response)) {
        items = response;
      } else if (response.success && response.data) {
        items = Array.isArray(response.data) ? response.data : (response.data.content || []);
      } else if (response.data && Array.isArray(response.data)) {
        items = response.data;
      } else if (response.content && Array.isArray(response.content)) {
        items = response.content;
      }

      const mapped = (items || []).map((u: any) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName || u.name || `User ${u.id}`,
        profile: u.profile || u.profileUrl || (u.profile?.url) || `https://i.pravatar.cc/150?u=${u.username}`,
      }));

      setFollowing(mapped);
    } catch (error) {
      console.error('Error fetching following:', error);
      toast({
        title: 'Error',
        description: 'Failed to load following',
        variant: 'destructive',
      });
    } finally {
      setLoadingFollowing(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this recipe?")) return;
    
    try {
      await deleteRecipe(id);
      setCreatedRecipes(createdRecipes.filter((recipe) => recipe.id !== id));
      toast({
        title: 'Success',
        description: 'Recipe deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting recipe:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete recipe',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (recipe: Recipe) => {
    navigate(`/recipes/edit/${recipe.id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-4">Please log in to view your profile.</p>
          <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </Card>
      </div>
    );
  }

  const stats = user.stats || {} as any;
  const displayStats = {
    recipesCount: (createdRecipes?.length) || (stats?.recipesCount ?? stats?.recipeCount ?? 0),
    followersCount: stats?.followersCount ?? stats?.followers ?? 0,
    followingCount: stats?.followingCount ?? stats?.following ?? 0,
  };

  // Controlled tab so we can react to changes and load lists when user switches tabs
  const [activeTab, setActiveTab] = useState<'created' | 'followers' | 'following' | 'saved'>('created');

  // Explicit handlers with logging so we can verify clicks in the console
  const handleShowFollowers = () => {
    console.log('handleShowFollowers clicked');
    if (!currentUser) {
      console.warn('No currentUser, cannot fetch followers');
      navigate('/login');
      return;
    }
    setActiveTab('followers');
    fetchFollowersData();
  };

  const handleShowFollowing = () => {
    console.log('handleShowFollowing clicked');
    if (!currentUser) {
      console.warn('No currentUser, cannot fetch following');
      navigate('/login');
      return;
    }
    setActiveTab('following');
    fetchFollowingData();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <header className="p-6 mb-8 rounded-lg bg-gray-50">
        <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          {(() => {
            const name = String(user.displayName || 'User');
            const username = String(user.username || '').toLowerCase();
            const isKaran = name.toLowerCase().includes('karan bista') || username === 'user84' || username === 'karan';
            const karanAvatar = 'https://i.pravatar.cc/150?u=karan_bista&img=3';
            const src = user.profileUrl || (isKaran ? karanAvatar : `https://i.pravatar.cc/150?u=${encodeURIComponent(username || name)}`);
            return (
              <img src={src} alt={user.displayName} className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-lg flex-shrink-0 -mt-16 sm:-mt-0" loading="lazy" />
            );
          })()}
          <div className="flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-4">
              <h1 className="text-3xl font-bold text-gray-900">{user.displayName}</h1>
              <Button size="sm" variant="outline" onClick={() => navigate('/profile/edit')}>
                Edit Profile
              </Button>
              <div className="hidden sm:flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium text-gray-600 bg-white/0"
                  onClick={handleShowFollowers}
                >
                  Followers ({displayStats.followersCount})
                </button>
              </div>
            </div>
        </div>
      </header>

      <div className="w-full">
        <div role="tablist" className="grid w-full grid-cols-4 bg-gray-100 rounded-lg p-1">
            <button
            role="tab"
            aria-selected={activeTab === 'created' ? 'true' : 'false'}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus:outline-none ${activeTab === 'created' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
            onClick={() => setActiveTab('created')}
          >
            Created ({createdRecipes.length})
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'followers' ? 'true' : 'false'}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus:outline-none ${activeTab === 'followers' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
            onClick={handleShowFollowers}
          >
            Followers ({displayStats.followersCount})
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'following' ? 'true' : 'false'}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus:outline-none ${activeTab === 'following' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
            onClick={() => { setActiveTab('following'); fetchFollowingData(); }}
          >
            Following ({displayStats.followingCount})
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'saved' ? 'true' : 'false'}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus:outline-none ${activeTab === 'saved' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
            onClick={() => setActiveTab('saved')}
          >
            Saved
          </button>
        </div>

        <div className="mt-2">
          {activeTab === 'created' && (
            <div>
              <div className="flex justify-end my-4">
                <Button asChild>
                  <Link to="/create-recipe">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add New Recipe
                  </Link>
                </Button>
              </div>
              {loadingRecipes ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="h-64 animate-pulse bg-gray-200" />
                  ))}
                </div>
              ) : createdRecipes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                  {createdRecipes.map((recipe) => (
                    <RecipeCard key={recipe.id} recipe={recipe} onEdit={handleEdit} onDelete={handleDelete} />
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center mt-6">
                  <p className="text-gray-600 mb-4">You haven't created any recipes yet.</p>
                  <Button asChild>
                    <Link to="/create-recipe">Create Your First Recipe</Link>
                  </Button>
                </Card>
              )}
            </div>
          )}
          }

          {activeTab === 'saved' && (
            <div>
              <SavedRecipes userId={user.id} />
            </div>
          )}
          {activeTab === 'followers' && (
            <div>
              {loadingFollowers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : followers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {followers.map((user) => (
                    <UserCard key={user.id} user={user} />
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center mt-6">
                  <p className="text-gray-600">You don't have any followers yet.</p>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'following' && (
            <div>
              {loadingFollowing ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : following.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {following.map((user) => (
                    <UserCard key={user.id} user={user} />
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center mt-6">
                  <p className="text-gray-600 mb-4">You're not following anyone yet.</p>
                  <Button asChild>
                    <Link to="/chefs">Discover Chefs</Link>
                  </Button>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
