import { Post } from "@shared/api";

export const staticFeedData: Post[] = [
  {
    id: 1,
    author: {
      id: 1,
      displayName: "Jane  Doe",
      profile: { 
        url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
      },
    },
    contentText: "Just tried the most amazing Spaghetti Carbonara recipe from this app! It was surprisingly easy and the result was restaurant-quality. Highly recommend giving it a try!",
    media: [{
        url: "https://images.unsplash.com/photo-1612874742237-6526221fcfbb?w=800&h=600&fit=crop"
    }],
    reactionsCount: 128,
    comments: [
        { id: 1, author: { displayName: "Alice"}, content: "Wow, that looks delicious!" },
        { id: 2, author: { displayName: "Bob"}, content: "I'm going to try this tonight!" },
    ],
    createdDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    author: {
      id: 2,
      displayName: "John Smith",
      profile: { 
          url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
      },
    },
    contentText: "I'm new to cooking and I just made the Thai Green Curry. The instructions were super clear and it turned out great! Feeling proud of myself.",
    media: [{
        url: "https://images.unsplash.com/photo-1455619452474-d2be8b1e4e31?w=800&h=600&fit=crop"
    }],
    reactionsCount: 72,
    comments: [],
    createdDate: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
];
