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
import { Link } from "react-router-dom";
import {
  followUser,
  unfollowUser,
  getCurrentUser,
  getAllUsers,
  isFollowing,
  getUserRecipes,
  getSimilarUsersPost,
  getUserById,
  getUserStatByUserId,
} from "@/lib/api";

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
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const currentUser = getCurrentUser();
  const pageSize = 10;

  const formatUser = (user: any): UserProfile => {
    const stats = user.stats || {};
    return {
      id: user.id,
      displayName: user.displayName || user.username || `User ${user.id}`,
      username: user.username || `user${user.id}`,
      email: user.email,
      bio: user.bio || "Passionate about creating delicious recipes",
      profileUrl: user.profileUrl || `https://i.pravatar.cc/150?u=${user.username || user.id}`,
      stats: stats,
      recipesCount: stats.recipeCount || 0,
      followersCount: stats.followersCount || 0,
      followingCount: stats.followingCount || 0,
      expertise: user.expertise || [],
      isFollowing: user.isFollowing || false,
    };
  };

  // Fetch real users from database with pagination
  const fetchAllUsers = async (page = 0) => {
    try {
      setIsLoading(true);
      const response = await getAllUsers(page, pageSize);
      
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
      const formattedUsers = users.map(formatUser);
      setAllUsers(formattedUsers);
      setFilteredUsers(formattedUsers);
      
      // Set top trending chefs by followers count
      const trending = [...formattedUsers]
        .sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0))
        .slice(0, 6);
      setTrendingChefs(trending);

      // Fetch follow status in background (non-blocking)
      if (currentUser?.id) {
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
          return {
            userId: user.id,
            isFollowing: followResponse.success && followResponse.data === true
          };
        } catch {
          return { userId: user.id, isFollowing: false };
        }
      });

      const followStatuses = await Promise.allSettled(followStatusPromises);
      
      // Update all user lists with follow status
      const updateUsers = (userList: UserProfile[]) =>
        userList.map(user => {
          const statusResult = followStatuses.find(
            (result) => result.status === 'fulfilled' && result.value.userId === user.id
          );
          if (statusResult && statusResult.status === 'fulfilled') {
            return { ...user, isFollowing: statusResult.value.isFollowing };
          }
          return user;
        });

      setAllUsers(updateUsers);
      setFilteredUsers(updateUsers);
      setRecommendedChefs(prev => updateUsers(prev));
      setTrendingChefs(prev => updateUsers(prev));
    } catch (err) {
      console.error("Failed to fetch follow statuses:", err);
      // Silently fail - users already displayed without follow status
    }
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
        const userAndStatsPromises = recommendedUserIds.map(async (userId: number) => {
          try {
            const [userRes, statsRes] = await Promise.all([
              getUserById(userId),
              getUserStatByUserId(userId)
            ]);
            
            if (userRes?.success && userRes.data) {
              const userData = userRes.data;
              // Attach stats to user object
              userData.stats = statsRes?.success ? statsRes.data : {};
              return userData;
            }
            return null;
          } catch (err) {
            console.warn(`Failed to fetch user ${userId}:`, err);
            return null;
          }
        });
        
        const userResponses = await Promise.all(userAndStatsPromises);
        
        // Filter out null values and format users
        const mlRecommendedChefs = userResponses
          .filter((user: any) => user !== null)
          .map(formatUser);
        
        if (mlRecommendedChefs.length > 0) {
          console.log(`Successfully fetched ${mlRecommendedChefs.length} ML-powered recommendations with stats`);
          setRecommendedChefs(mlRecommendedChefs);
          return;
        } else {
          console.log("No ML recommendations could be fetched, falling back to popularity-based");
        }
      }
      
      // Fallback to popularity-based recommendations if ML fails
      console.log("ML recommendations failed or empty, falling back to popularity-based");
      const top6 = [...allUsers]
        .sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0))
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
      await fetchAllUsers(currentPage);
      setIsLoading(false);
    };
    loadData();
  }, [currentPage]);

  useEffect(() => {
    if (allUsers.length > 0) {
      fetchRecommendedChefs();
    }
  }, [allUsers]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = allUsers.filter((user) =>
        user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(allUsers);
    }
  }, [searchTerm, allUsers]);

  const handleFollow = async (userId: number) => {
    if (!currentUser?.id) {
      window.location.href = "/login";
      return;
    }

    try {
      await followUser(currentUser.id, userId);
      
      // Update UI optimistically
      const updateFollowState = (users: UserProfile[]) =>
        users.map(u => 
          u.id === userId 
            ? { ...u, isFollowing: true, followersCount: (u.followersCount || 0) + 1 } 
            : u
        );
      
      setAllUsers(updateFollowState);
      setFilteredUsers(updateFollowState);
      setRecommendedChefs(updateFollowState);
      setTrendingChefs(updateFollowState);
    } catch (err: any) {
      console.error("Failed to follow user:", err);
      setError("Failed to follow user. Please try again.");
    }
  };

  const handleUnfollow = async (userId: number) => {
    if (!currentUser?.id) return;

    try {
      await unfollowUser(currentUser.id, userId);
      
      // Update UI optimistically
      const updateFollowState = (users: UserProfile[]) =>
        users.map(u => 
          u.id === userId 
            ? { ...u, isFollowing: false, followersCount: Math.max((u.followersCount || 0) - 1, 0) } 
            : u
        );
      
      setAllUsers(updateFollowState);
      setFilteredUsers(updateFollowState);
      setRecommendedChefs(updateFollowState);
      setTrendingChefs(updateFollowState);
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
                className="pl-12 pr-4 py-3 rounded-lg bg-gray-50 border-gray-300 text-lg"
              />
            </div>
          </div>
        </div>

        {/* ML-Powered Recommendations */}
        {recommendedChefs.length > 0 && (
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
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
              <TabsTrigger value="all" className="gap-2">
                <Users className="h-4 w-4" />
                All Chefs ({filteredUsers.length})
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
  onFollow: (id: number) => void;
  onUnfollow: (id: number) => void;
}) => {
  const [imgError, setImgError] = useState(false);
  const imageUrl = imgError 
    ? `https://i.pravatar.cc/150?u=${chef.username || chef.id}`
    : chef.profileUrl || `https://i.pravatar.cc/150?u=${chef.username || chef.id}`;

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
            onClick={() => onUnfollow(chef.id)}
          >
            <UserCheck className="h-4 w-4" />
            Following
          </Button>
        ) : (
          <Button
            className="w-full gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            onClick={() => onFollow(chef.id)}
          >
            <UserPlus className="h-4 w-4" />
            Follow
          </Button>
        )}
      </div>
    </Card>
  );
};
