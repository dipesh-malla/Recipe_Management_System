// Cached/Redis-backed recipe API
export const getCachedFilteredRecipes = (params: {
  cuisine?: string;
  difficulty?: string;
  maxCookTime?: number;
  searchTerm?: string;
  page?: number;
  size?: number;
}) => {
  const {
    cuisine = "all",
    difficulty = "all",
    maxCookTime,
    searchTerm = "",
    page = 0,
    size = 16,
  } = params;
  const query = [
    `cuisine=${encodeURIComponent(cuisine)}`,
    `difficulty=${encodeURIComponent(difficulty)}`,
    maxCookTime !== undefined ? `maxCookTime=${maxCookTime}` : null,
    searchTerm ? `searchTerm=${encodeURIComponent(searchTerm)}` : null,
    `page=${page}`,
    `size=${size}`,
  ].filter(Boolean).join("&");
  return javaApiFetch(`/v1/recipes/cachedFiltered?${query}`);
};
// Environment-based configuration
const JAVA_BASE_URL = import.meta.env.VITE_JAVA_API_URL || "http://localhost:8090/api";
const ML_BASE_URL = import.meta.env.VITE_ML_API_URL || "http://localhost:8000/api";

// Log API URLs for debugging (only in development)
if (import.meta.env.DEV) {
  console.log("🔗 API Configuration:");
  console.log("  Java Backend:", JAVA_BASE_URL);
  console.log("  ML Backend:", ML_BASE_URL);
}

// =================================================================
// BASE API SETUP
// =================================================================

const getAuthToken = () => {
  return localStorage.getItem("authToken");
};

export const setAuthToken = (token: string) => {
  localStorage.setItem("authToken", token);
};

export const removeAuthToken = () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("currentUser"); // Also remove user data
};

const handleUnauthorized = () => {
  removeAuthToken();
  window.location.href = "/login";
};

export const setCurrentUser = (user: any) => {
    localStorage.setItem("currentUser", JSON.stringify(user));
}

export const getCurrentUser = () => {
    const user = localStorage.getItem("currentUser");
    return user ? JSON.parse(user) : null;
}

// Track Java backend availability to avoid spamming requests when it's down.
let javaBackendAvailable = true;
let javaBackendHealthInterval: number | null = null;

export const isJavaBackendAvailable = () => javaBackendAvailable;

const scheduleJavaHealthCheck = (intervalMs = 5000) => {
  if (javaBackendHealthInterval) return;
  javaBackendHealthInterval = window.setInterval(async () => {
    try {
      const res = await fetch(`${JAVA_BASE_URL}/health`, { method: 'GET' });
      if (res.ok) {
        javaBackendAvailable = true;
        if (javaBackendHealthInterval) {
          clearInterval(javaBackendHealthInterval);
          javaBackendHealthInterval = null;
        }
      }
    } catch (e) {
      // still down
    }
  }, intervalMs);
};

// Do a one-time health probe on import to set the initial availability flag.
(async function initialJavaHealthProbe() {
  try {
    const res = await fetch(`${JAVA_BASE_URL}/health`, { method: 'GET' });
    javaBackendAvailable = res.ok;
    if (!res.ok) {
      scheduleJavaHealthCheck();
    }
  } catch (e) {
    javaBackendAvailable = false;
    scheduleJavaHealthCheck();
  }
})();

const apiFetch = async (baseUrl: string, url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  let headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (!Array.isArray(options.headers)) {
      headers = { ...headers, ...options.headers as Record<string, string> };
    }
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Short-circuit calls to Java backend while it's known to be down
  if (baseUrl === JAVA_BASE_URL && !javaBackendAvailable) {
    throw new Error("Java backend is currently unavailable");
  }

  try {
    const response = await fetch(`${baseUrl}${url}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      handleUnauthorized();
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "An unknown error occurred" }));
      throw new Error(errorData.message || "Something went wrong with the request");
    }

    // If we reach here, backend is reachable
    if (baseUrl === JAVA_BASE_URL && !javaBackendAvailable) {
      javaBackendAvailable = true;
      if (javaBackendHealthInterval) {
        clearInterval(javaBackendHealthInterval);
        javaBackendHealthInterval = null;
      }
    }

    return response.json();
  } catch (err: any) {
    // Network-level failures (e.g., ECONNREFUSED) land here — mark Java backend as down and start health checks
    if (baseUrl === JAVA_BASE_URL) {
      javaBackendAvailable = false;
      scheduleJavaHealthCheck();
    }
    throw err;
  }
};

const apiFetchMultipart = async (baseUrl: string, url: string, formData: FormData, method: 'POST' | 'PUT' = 'POST') => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}${url}`, {
        method,
        body: formData,
        headers,
    });

    if (response.status === 401) {
        handleUnauthorized();
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "An unknown error occurred with the multipart request" }));
        throw new Error(errorData.message || "Something went wrong with the multipart request");
    }

    return response.json();
};


const javaApiFetch = (url: string, options?: RequestInit) => apiFetch(JAVA_BASE_URL, url, options);
const mlApiFetch = (url: string, options?: RequestInit) => apiFetch(ML_BASE_URL, url, options);
const javaApiFetchMultipart = (url: string, formData: FormData, method?: 'POST' | 'PUT') => apiFetchMultipart(JAVA_BASE_URL, url, formData, method);


// =================================================================
// AUTHENTICATION API
// =================================================================

export const register = (data: any) => {
  return javaApiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  }).then((response) => {
    if (response.data.token) {
      setAuthToken(response.data.token);
      setCurrentUser(response.data.user); // Save user data
    }
    return response;
  });
};

export const login = (data: any) => {
    if (data.email === "dummy@user.com" && data.password === "password") {
        const dummyUser = {
            id: 123,
            displayName: "Dummy User",
            email: "dummy@user.com",
            profile: { url: "https://i.pravatar.cc/150?u=a042581f4e29026704d" },
        };
        const dummyToken = "dummy-auth-token";

        setAuthToken(dummyToken);
        setCurrentUser(dummyUser);

        return Promise.resolve({
            data: {
                token: dummyToken,
                user: dummyUser,
            },
        });
    }

  return javaApiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  }).then((response) => {
    if (response.data.token) {
      setAuthToken(response.data.token);
      setCurrentUser(response.data.user); // Save user data
    }
    return response;
  });
};


// =================================================================
// USER MANAGEMENT API
// =================================================================

export const getAllUsers = (page = 0, size = 10) => javaApiFetch(`/v1/users?page=${page}&size=${size}`);

export const getUserById = (id: number) => javaApiFetch(`/v1/users/${id}`);

export const getUserRecipes = (userId: number, page = 0, size = 20) => javaApiFetch(`/v1/recipes/user/${userId}?page=${page}&size=${size}`);

export const updateUserProfile = (profileData: any, file?: File) => {
    const formData = new FormData();
    formData.append('profile', new Blob([JSON.stringify(profileData)], { type: 'application/json' }));
    if (file) {
        formData.append('file', file);
    }
    return javaApiFetchMultipart("/v1/users/update", formData, 'PUT');
};

export const deleteUser = (id: number) => javaApiFetch(`/v1/users/${id}`, { method: 'DELETE' });

export const filterUsers = (filterData: any) => javaApiFetch("/v1/users/filter", { method: 'POST', body: JSON.stringify(filterData) });


// =================================================================
// RECIPE API
// =================================================================

export const getAllRecipes = (page = 0, size = 50, sortBy = "createdDate", sortOrder = "DESC") => 
  javaApiFetch(`/v1/recipes/allRecipe?page=${page}&size=${size}&sortBy=${sortBy}&sortOrder=${sortOrder}`);

export const createRecipe = (recipeData: any, files: File[]) => {
    const formData = new FormData();
    formData.append('recipe', new Blob([JSON.stringify(recipeData)], { type: 'application/json' }));
    files.forEach(file => formData.append('files', file));
    return javaApiFetchMultipart("/v1/recipes", formData, 'POST');
};

export const getRecipeById = (id: number | string) => {
  // Short-circuit if we already know the Java backend is down
  if (!javaBackendAvailable) {
    return Promise.resolve({ data: { id, title: `Recipe ${id}`, image: 'https://placehold.co/400x300/e2e8f0/64748b?text=Recipe+Image', cuisine: null, difficulty: null, cookTime: 0, authorName: 'Unknown Chef', reactionsCount: 0, commentsCount: 0 } });
  }

  return (async () => {
    try {
      const resp = await javaApiFetch(`/v1/recipes/find/${id}`);
      return resp;
    } catch (err: any) {
      // Mark backend as down and schedule health checks, but don't rethrow.
      try {
        javaBackendAvailable = false;
        scheduleJavaHealthCheck();
      } catch (e) {
        // ignore
      }
      // Return a minimal fallback DTO so callers can continue without errors.
      return { data: { id, title: `Recipe ${id}`, image: 'https://placehold.co/400x300/e2e8f0/64748b?text=Recipe+Image', cuisine: null, difficulty: null, cookTime: 0, authorName: 'Unknown Chef', reactionsCount: 0, commentsCount: 0 } };
    }
  })();
};

// Lightweight health check helper for UI code to probe Java backend once before bulk requests
export const checkJavaHealth = async () => {
  try {
    const res = await fetch(`${JAVA_BASE_URL}/health`, { method: 'GET' });
    if (res.ok) {
      javaBackendAvailable = true;
      if (javaBackendHealthInterval) {
        clearInterval(javaBackendHealthInterval);
        javaBackendHealthInterval = null;
      }
      return true;
    }
    javaBackendAvailable = false;
    scheduleJavaHealthCheck();
    return false;
  } catch (e) {
    javaBackendAvailable = false;
    scheduleJavaHealthCheck();
    return false;
  }
};

export const deleteRecipe = (id: number) => javaApiFetch(`/v1/recipes/delete/${id}`, { method: 'DELETE' });

export const getRecipesByUser = (userId: number) => javaApiFetch(`/v1/recipes/user/${userId}`);

export const updateRecipe = (id: number, recipeData: any, files?: File[]) => {
    const formData = new FormData();
    formData.append('recipe', new Blob([JSON.stringify(recipeData)], { type: 'application/json' }));
    if (files) {
        files.forEach(file => formData.append('files', file));
    }
    return javaApiFetchMultipart(`/v1/recipes/${id}`, formData, 'PUT');
};

export const filterRecipes = (filterData: any) => javaApiFetch("/v1/recipes/filter", { method: 'POST', body: JSON.stringify(filterData) });


// =================================================================
// POST API
// =================================================================

export const getAllPosts = () => javaApiFetch("/posts");

export const createOrUpdatePost = (postData: any, files?: File[]) => {
    const formData = new FormData();
    formData.append('post', new Blob([JSON.stringify(postData)], { type: 'application/json' }));
    if (files) {
        files.forEach(file => formData.append('files', file));
    }
    return javaApiFetchMultipart("/posts", formData, 'POST');
};

export const getPostById = (id: number) => javaApiFetch(`/posts/${id}`);

export const getPostsByUser = (userId: number) => javaApiFetch(`/posts/byUserId/${userId}`);

export const getPostsWithImages = () => javaApiFetch("/posts/postWithImage");

export const getReelVideos = () => javaApiFetch("/posts/reelVideos");

export const filterPosts = (filterData: any) => javaApiFetch("/posts/filter", { method: 'POST', body: JSON.stringify(filterData) });

export const deletePost = (id: number) => javaApiFetch(`/posts/delete?id=${id}`, { method: 'DELETE' });


// =================================================================
// FOLLOW API
// =================================================================

export const followUser = (followerId: number, followeeId: number) => javaApiFetch("/v1/follow/follow", { method: 'POST', body: JSON.stringify({ follower: followerId, followee: followeeId }) });

export const unfollowUser = (followerId: number, followeeId: number) => javaApiFetch(`/v1/follow/unfollow?followerId=${followerId}&followeeId=${followeeId}`, { method: 'DELETE' });

export const checkIfFollowing = (followerId: number, followeeId: number) => javaApiFetch(`/v1/follow/check?followerId=${followerId}&followeeId=${followeeId}`);

export const isFollowing = (followerId: number, followeeId: number) => checkIfFollowing(followerId, followeeId);

export const checkIfMutualFollow = (followerId: number, followeeId: number) => javaApiFetch(`/v1/follow/isMutual?followerId=${followerId}&followeeId=${followeeId}`);

export const searchFollows = (searchData: any) => javaApiFetch("/v1/follow/search", { method: 'GET', body: JSON.stringify(searchData) });

export const getFollowers = (userId: number) => javaApiFetch(`/v1/follow/followers/${userId}`);

export const getFollowing = (userId: number) => javaApiFetch(`/v1/follow/following/${userId}`);


// =================================================================
// MESSAGE API
// =================================================================

export const getConversations = (userId?: number) => {
    const user = userId || getCurrentUser()?.id;
    if (!user) {
        return Promise.reject(new Error("User ID is required to fetch conversations"));
    }
  // Make conversations fetching resilient: do not throw on network errors
  return (async () => {
    try {
      const resp = await javaApiFetch(`/messages/conversations/${user}`);
      return resp;
    } catch (err: any) {
      // If Java backend failed, mark unavailable and schedule health checks
      try {
        javaBackendAvailable = false;
        scheduleJavaHealthCheck();
      } catch (e) {
        // ignore
      }
      // Return safe empty list to callers so UI doesn't spam logs
      return [] as any;
    }
  })();
};

export const getMessages = (userId: number, limit = 50, offset = 0) => javaApiFetch(`/messages/${userId}?limit=${limit}&offset=${offset}`);

export const sendMessage = (data: { receiverId: number, body: string }) => javaApiFetch("/messages/send", { method: 'POST', body: JSON.stringify(data) });

export const markMessagesAsRead = (conversationUserId: number) => javaApiFetch(`/messages/read/${conversationUserId}`, { method: 'PUT' });


// =================================================================
// NOTIFICATION API
// =================================================================

export const getNotificationsForUser = (userId: number) => javaApiFetch(`/notifications/${userId}`);

export const getUnreadNotificationsForUser = (userId: number) => {
  if (!javaBackendAvailable) {
    // Backend is down — return empty unread list quickly to avoid console noise
    return Promise.resolve([] as any);
  }

  return (async () => {
    try {
      const resp = await javaApiFetch(`/notifications/${userId}/unread`);
      return resp;
    } catch (err: any) {
      // On network errors, mark backend as down and schedule health checks
      try {
        javaBackendAvailable = false;
        scheduleJavaHealthCheck();
      } catch (e) {}
      // Return safe empty list so callers don't throw/log repeatedly
      return [] as any;
    }
  })();
};

export const getAllSystemNotifications = () => javaApiFetch(`/notifications/all`);

export const markNotificationAsRead = (notificationId: number) => javaApiFetch(`/notifications/${notificationId}/read`, { method: 'PUT' });

export const markAllNotificationsAsRead = (userId: number) => javaApiFetch(`/notifications/${userId}/read-all`, { method: 'PUT' });


// =================================================================
// REACTION & COMMENT API
// =================================================================

// --- Post Reactions & Comments ---
export const addReactionToPost = (data: { postId: number, reactionType: string }) => javaApiFetch("/reactions/like", { method: 'POST', body: JSON.stringify(data) });
export const addCommentToPost = (data: { postId: number, content: string }) => javaApiFetch("/comments", { method: 'POST', body: JSON.stringify(data) });

// --- Recipe Reactions & Comments ---
export const likeRecipe = (data: { recipeId: number, reactionType: string }) => javaApiFetch("/recipe-reactions/like", { method: 'POST', body: JSON.stringify(data) });
export const unlikeRecipe = (reactionId: number) => javaApiFetch(`/recipe-reactions/${reactionId}`, { method: 'DELETE' });
export const addCommentToRecipe = (data: { recipeId: number, content: string }) => javaApiFetch("/recipe-comments", { method: 'POST', body: JSON.stringify(data) });


// =================================================================
// SAVES/BOOKMARKS API
// =================================================================

export const saveResource = (data: { userId: number, resourceType: 'RECIPE' | 'POST' | 'USER', resourceId: number }) => javaApiFetch("/saves", { method: 'POST', body: JSON.stringify(data) });

export const getAllSavedItems = (userId: number) => javaApiFetch(`/saves/${userId}`);

export const getSavedItemsByType = (data: { userId: number, resourceType: 'RECIPE' | 'POST' | 'USER' }) => javaApiFetch("/saves/bytype", { method: 'GET', body: JSON.stringify(data) });

export const unsaveResource = (saveId: number) => javaApiFetch(`/saves/delete/${saveId}`, { method: 'DELETE' });


// =================================================================
// USER STATS API
// =================================================================

export const createUserStat = (data: any) => javaApiFetch("/v1/user-stats", { method: 'POST', body: JSON.stringify(data) });

export const getUserStatById = (id: number) => javaApiFetch(`/v1/user-stats/${id}`);

export const getUserStatByUserId = (userId: number) => javaApiFetch(`/v1/user-stats/userId/${userId}`);

export const getAllUserStats = () => javaApiFetch("/v1/user-stats/allUserStats");

export const filterUserStats = (filterData: any) => javaApiFetch("/v1/user-stats/filter", { method: 'POST', body: JSON.stringify(filterData) });

export const deleteUserStat = (id: number) => javaApiFetch(`/v1/user-stats/${id}`, { method: 'DELETE' });


// =================================================================
// AIML/EMBEDDINGS API
// =================================================================

export const logUserInteraction = (data: any) => javaApiFetch("/aiml/interactions", { method: 'POST', body: JSON.stringify(data) });

export const getAllInteractions = () => javaApiFetch("/aiml/getAllInteraction");

export const createOrUpdateEmbedding = (objectType: string, objectId: number, modelVersion: string, embedding: number[]) => {
    return javaApiFetch(`/aiml/embeddings?objectType=${objectType}&objectId=${objectId}&modelVersion=${modelVersion}`, { method: 'POST', body: JSON.stringify(embedding) });
};

export const getEmbeddingForObject = (objectType: string, objectId: number) => javaApiFetch(`/aiml/embeddings/${objectType}/${objectId}`);

export const getAllEmbeddingsByType = (objectType: string) => javaApiFetch(`/aiml/embeddings/${objectType}`);

export const getAllEmbeddings = () => javaApiFetch("/aiml");

export const importDatasetFromFile = (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return javaApiFetchMultipart("/aiml/dataset/import", formData, 'POST');
};

export const importDatasetFromJson = (jsonData: any) => javaApiFetch("/aiml/dataset/import-json", { method: 'POST', body: JSON.stringify(jsonData) });

export const getDatasetStats = () => javaApiFetch("/aiml/dataset/stats");

export const clearAllMlData = () => javaApiFetch("/aiml/dataset/clear", { method: 'DELETE' });


// =================================================================
// RECOMMENDATIONS API (ML Backend)
// =================================================================

export const getRecipeRecommendationsGet = (userId: number, topK = 20) => mlApiFetch(`/recommendations/recipes?userId=${userId}&topK=${topK}`);

export const getRecipeRecommendationsPost = (data: any) => mlApiFetch("/recommendations/recipes", { method: 'POST', body: JSON.stringify(data) });

export const getSimilarRecipes = (data: { recipe_id: number, top_k: number }) => mlApiFetch("/recommendations/recipes/similar", { method: 'POST', body: JSON.stringify(data) });

// Get similar users (user recommendations) from ML backend
export const getSimilarUsersPost = (userId: number, topK = 10) => 
  mlApiFetch("/recommendations/users", { 
    method: 'POST', 
    body: JSON.stringify({ user_id: userId, top_k: topK }) 
  });

export const getColdStartRecommendations = (data: any) => mlApiFetch("/recommendations/cold-start", { method: 'POST', body: JSON.stringify(data) });

export const getBatchRecommendations = (data: any) => mlApiFetch("/recommendations/batch", { method: 'POST', body: JSON.stringify(data) });

export const getMlHealth = () => mlApiFetch("/health");


