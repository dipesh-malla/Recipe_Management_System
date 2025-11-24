import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, Trash2, PlusCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCurrentUser, getUserById, getUserRecipes, getFollowers, getFollowing, deleteRecipe } from '@/lib/api';
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
  const imageUrl = recipe.imageUrl || recipe.media?.[0]?.url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';
  const [imgError, setImgError] = useState(false);

  return (
    <Card className="overflow-hidden group relative hover:shadow-lg transition-shadow">
      <Link to={`/recipe/${recipe.id}`}>
        <img 
          src={imgError ? 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400' : imageUrl}
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
      <img 
        src={user.profile || `https://i.pravatar.cc/150?u=${user.username}`}
        alt={user.displayName} 
        className="h-12 w-12 rounded-full object-cover"
        loading="lazy"
      />
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
          const recipesArray = Array.isArray(recipesResponse.value.data) 
            ? recipesResponse.value.data 
            : recipesResponse.value.data.content || [];
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
  }, [currentUser, navigate, toast]);

  const fetchFollowersData = async () => {
    if (!currentUser || followers.length > 0) return;
    
    try {
      setLoadingFollowers(true);
      const response = await getFollowers(currentUser.id);
      if (response.success && response.data) {
        setFollowers(response.data);
      }
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
    if (!currentUser || following.length > 0) return;
    
    try {
      setLoadingFollowing(true);
      const response = await getFollowing(currentUser.id);
      if (response.success && response.data) {
        setFollowing(response.data);
      }
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

  const stats = user.stats || { recipeCount: createdRecipes.length, followersCount: 0, followingCount: 0 };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <header className="p-6 mb-8 rounded-lg bg-gray-50">
        <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <img 
            src={user.profileUrl || `https://i.pravatar.cc/150?u=${user.username}`}
            alt={user.displayName} 
            className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-lg flex-shrink-0 -mt-16 sm:-mt-0"
            loading="lazy"
          />
          <div className="flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-4">
              <h1 className="text-3xl font-bold text-gray-900">{user.displayName}</h1>
              <Button size="sm" variant="outline" onClick={() => navigate('/profile/edit')}>
                Edit Profile
              </Button>
            </div>
            <p className="text-gray-600 mt-1">@{user.username}</p>
            {user.bio && <p className="mt-4 text-gray-700 max-w-xl mx-auto sm:mx-0">{user.bio}</p>}
            <div className="flex gap-6 mt-4 justify-center sm:justify-start text-gray-600">
              <span><span className="font-bold text-gray-900">{stats.recipeCount}</span> Recipes</span>
              <span><span className="font-bold text-gray-900">{stats.followersCount}</span> Followers</span>
              <span><span className="font-bold text-gray-900">{stats.followingCount}</span> Following</span>
            </div>
          </div>
        </div>
      </header>

      <Tabs defaultValue="created" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100 rounded-lg p-1">
          <TabsTrigger value="created">Created ({createdRecipes.length})</TabsTrigger>
          <TabsTrigger value="followers" onClick={fetchFollowersData}>
            Followers ({stats.followersCount})
          </TabsTrigger>
          <TabsTrigger value="following" onClick={fetchFollowingData}>
            Following ({stats.followingCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="created">
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
        </TabsContent>

        <TabsContent value="followers">
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
        </TabsContent>

        <TabsContent value="following">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
