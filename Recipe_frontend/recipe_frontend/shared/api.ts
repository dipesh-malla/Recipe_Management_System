/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

/**
 * Request type for /api/v1/recipes/recommendations
 */
export interface RecipeRecommendationRequest {
  recipe_id: number;
  top_k: number;
}

/**
 * Response type for /api/v1/recipes/recommendations
 */
export interface RecipeRecommendationResponse {
  recommendations: Recommendation[];
}

export interface Recommendation {
  id: number;
  title: string;
  description: string;
  cuisine: string;
  difficulty: string;
  cookTime: number;
  prepTime: number;
  servings: number;
  author: {
    id: number;
    username: string;
    displayName: string;
    profile: any; // Define as needed
  };
  media: any[]; // Define as needed
  ingredients: any[]; // Define as needed
  instructions: any[]; // Define as needed
  tags: string[];
  reactionsCount: number;
  commentsCount: number;
  createdDate: string;
  lastModifiedDate: string;
  isPublic: boolean;
}

/**
 * Notification type
 */
export interface Notification {
    id: number;
    actor: { id: number; displayName: string; profile: { url: string } };
    verb: string;
    object: { type: string; id: number; content: string };
    isRead: boolean;
    createdDate: string;
}

/**
 * Message & Conversation Types
 */
export interface Message {
    id: number;
    sender: { id: number; displayName: string; profile: { url: string } };
    receiver: { id: number; displayName: string; profile: { url: string } };
    body: string;
    createdDate: string;
    read: boolean;
}

export interface Conversation {
    id: number;
    participant: { id: number; displayName: string; profile: { url: string } };
    lastMessage: Message;
    unreadCount: number;
}

export interface User {
    id: number;
    username: string;
    displayName: string;
    email?: string;
    bio?: string;
    location?: string;
    isChef?: boolean;
    dietaryPreferences?: string[];
    badges?: string[];
    privacySettings?: "PUBLIC" | "PRIVATE";
    verified?: boolean;
    isNew?: boolean;
    profile?: {
        id: string;
        url: string;
        mediaType: string;
    };
}

export interface Post {
    id: number;
    author: {
        id: number;
        displayName: string;
        profile?: {
            url: string;
        };
    };
    contentText: string;
    media?: {
        url: string;
    }[];
    reactionsCount: number;
    comments: any[];
    createdDate: string;
}
export interface Recipe {
  id: number;
  title: string;
  description: string;
  cuisine: string;
  dietaryType: string;
  servings: number;
  cookTime: number;
  prepTime: number;
  difficulty: string;
  isPublic: boolean;
  createdDate: string;
  modifiedDate: string;
  ingredients: {
    id: number;
    name: string;
    amount: number;
    unit: string;
  }[];
  instructions: {
    id: number;
    content: string;
    stepNumber: number;
  }[];
  media: {
    id: string;
    url: string;
    mediaType: string;
    uploadedAt: string;
  }[];
  author: User;
  tags: {
    id: number;
    name: string;
  }[];
  reactionsCount: number;
  commentsCount: number;
  isNew: boolean;
}

export interface SavedItem {
    id: number;
    userId: number;
    resourceType: "RECIPE" | "POST" | "USER";
    resourceId: number;
    resource: Partial<Recipe> | Partial<Post> | Partial<User>;
    createdDate: string;
}
