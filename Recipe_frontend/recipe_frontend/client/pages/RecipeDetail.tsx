import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useParams, Link } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Send,
  ChefHat,
  Volume2
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { 
    getCurrentUser,
    getRecipeById, 
    likeRecipe, 
    addCommentToRecipe, 
    saveResource,
    getAllSavedItems,
    unsaveResource,
    followUser, 
    getCachedFilteredRecipes,
    getSimilarRecipes,
    getRecipeRecommendationsPost,
    getUserStatByUserId,
    getUserById
} from "@/lib/api";
import { RecipeRecommendationResponse } from "@shared/api";

interface Recipe {
  id: string;
  title: string;
  description: string;
  image: string;
  cuisine: string;
  difficulty: string;
  cookTime: number;
  prepTime: number;
  servings: number;
  author: {
    id: number;
    name: string;
    avatar: string;
    followers: number;
  };
  reactions: number;
  comments: any[];
  ingredients: {
    name: string;
    amount: number | string;
    unit: string;
  }[];
  instructions: {
    stepNumber: number;
    content: string;
  }[];
}

interface Recommendation extends Omit<Recipe, 'id'> {
    id: number;
}


export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveRecordId, setSaveRecordId] = useState<number | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const synthRef = (typeof window !== 'undefined' && (window as any).speechSynthesis) ? (window as any).speechSynthesis : null;
  const utterancesRef = useRef<SpeechSynthesisUtterance[] | null>(null);
  const currentUser = getCurrentUser();

 const staticRecipeDetails = [
  {
    id: "1",
    title: "Classic Spaghetti Carbonara",
    description: "A timeless Roman classic, this Spaghetti Carbonara is a creamy, decadent pasta dish made with eggs, Pecorino Romano cheese, pancetta, and black pepper. Ready in under 30 minutes, it's the perfect weeknight indulgence.",
    image: "https://images.unsplash.com/photo-1612874742237-6526221fcfbb?w=800&h=600&fit=crop",
    cuisine: "Italian",
    difficulty: "Easy",
    cookTime: 25,
    prepTime: 10,
    servings: 4,
    author: {
      id: 1,
      name: "Chef Marco",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      followers: 12500,
    },
    reactions: 452,
    comments: [
      { id: 1, author: { displayName: "Alice", profile: { url: "https://i.pravatar.cc/150?u=alice" }}, content: "This was amazing! So simple and delicious." },
      { id: 2, author: { displayName: "Bob", profile: { url: "https://i.pravatar.cc/150?u=bob" }}, content: "My family loved it. Will definitely make it again." },
    ],
    ingredients: [
      { name: "Spaghetti", amount: 400, unit: "g" },
      { name: "Pancetta or Guanciale", amount: 150, unit: "g" },
      { name: "Large Egg Yolks", amount: 4, unit: "" },
      { name: "Pecorino Romano Cheese", amount: 1, unit: "cup" },
      { name: "Black Pepper", amount: 1, unit: "tbsp" },
    ],
    instructions: [
      { stepNumber: 1, content: "Boil the spaghetti in generously salted water until al dente." },
      { stepNumber: 2, content: "While the pasta cooks, fry the pancetta in a pan until crisp. Turn off the heat." },
      { stepNumber: 3, content: "In a bowl, whisk together the egg yolks, grated Pecorino Romano, and a generous amount of freshly cracked black pepper." },
      { stepNumber: 4, content: "Drain the pasta, reserving a cup of the pasta water. Immediately add the hot pasta to the pan with the pancetta and toss to combine." },
      { stepNumber: 5, content: "Quickly pour the egg and cheese mixture over the pasta, stirring vigorously to create a creamy sauce. If it's too thick, add a splash of the reserved pasta water. Serve immediately with extra cheese and pepper." },
    ],
  },
  {
    id: "2",
    title: "Authentic Thai Green Curry",
    description: "A vibrant and aromatic Thai Green Curry with chicken, bamboo shoots, and Thai basil. This recipe balances the spicy, sweet, salty, and sour flavors that make Thai cuisine so beloved.",
    image: "https://images.unsplash.com/photo-1455619452474-d2be8b1e4e31?w=800&h=600&fit=crop",
    cuisine: "Thai",
    difficulty: "Medium",
    cookTime: 30,
    prepTime: 15,
    servings: 4,
    author: {
      id: 2,
      name: "Chef Priya",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
      followers: 22300,
    },
    reactions: 580,
    comments: [],
    ingredients: [
      { name: "Chicken Breast, sliced", amount: 500, unit: "g" },
      { name: "Green Curry Paste", amount: 3, unit: "tbsp" },
      { name: "Coconut Milk", amount: 400, unit: "ml" },
      { name: "Bamboo Shoots", amount: 1, unit: "can" },
      { name: "Thai Basil Leaves", amount: 1, unit: "cup" },
      { name: "Fish Sauce", amount: 2, unit: "tbsp" },
      { name: "Palm Sugar", amount: 1, unit: "tbsp" },
    ],
    instructions: [
      { stepNumber: 1, content: "In a large wok or pot, heat half of the coconut milk over medium heat. Add the green curry paste and cook until fragrant." },
      { stepNumber: 2, content: "Add the sliced chicken and cook until no longer pink." },
      { stepNumber: 3, content: "Pour in the remaining coconut milk, fish sauce, and palm sugar. Bring to a simmer." },
      { stepNumber: 4, content: "Add the bamboo shoots and cook for 5-7 minutes, until the chicken is cooked through and the curry has thickened slightly." },
      { stepNumber: 5, content: "Stir in the Thai basil leaves until they wilt. Serve hot with jasmine rice." },
    ],
  },
  {
    id: "3",
    title: "Japanese Ramen Masterclass",
    description: "Craft a rich and flavorful bowl of Tonkotsu ramen from scratch. This masterclass guides you through creating a creamy pork broth, tender chashu pork, and perfectly seasoned soft-boiled eggs.",
    image: "https://images.unsplash.com/photo-1623078876921-e3a8ae0df6c8?w=800&h=600&fit=crop",
    cuisine: "Japanese",
    difficulty: "Hard",
    cookTime: 720,
    prepTime: 60,
    servings: 6,
    author: {
      id: 3,
      name: "Chef Takeshi",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
      followers: 89000,
    },
    reactions: 890,
    comments: [],
    ingredients: [
      { name: "Pork Bones (femur)", amount: 2, unit: "kg" },
      { name: "Pork Belly", amount: 1, unit: "kg" },
      { name: "Ramen Noodles", amount: 6, unit: "servings" },
      { name: "Eggs", amount: 6, unit: "" },
      { name: "Green Onions", amount: 1, unit: "bunch" },
      { name: "Soy Sauce", amount: 1, unit: "cup" },
      { name: "Mirin", amount: 0.5, unit: "cup" },
    ],
    instructions: [
      { stepNumber: 1, content: "Blanch the pork bones, then rinse. Add to a large stockpot, cover with water, and simmer for at least 12 hours to create the tonkotsu broth." },
      { stepNumber: 2, content: "Roll and tie the pork belly. Braise it in a mixture of soy sauce, mirin, and water for 2 hours until tender. Let it cool in the braising liquid." },
      { stepNumber: 3, content: "Boil the eggs for exactly 6 minutes, then transfer to an ice bath. Peel and marinate them in the cooled pork braising liquid for at least 4 hours." },
      { stepNumber: 4, content: "Cook the ramen noodles according to package directions." },
      { stepNumber: 5, content: "To assemble, add ramen tare (seasoning) to a bowl, followed by the hot broth. Add the noodles, sliced chashu pork, a halved marinated egg, and chopped green onions." },
    ],
  },
];

const staticRecommendations = staticRecipeDetails.slice(1, 4).map(r => ({ ...r, id: parseInt(r.id) }));


  useEffect(() => {
    if (id) {
        setRecipe(null);
        setRecommendations([]);
        setError(null);

        getRecipeById(id)
          .then(async data => {
            const d = data.data;
            console.debug("[RecipeDetail] fetched DTO:", d);
                
                // Check if recipe data is valid
                if (!d) {
                    throw new Error("Recipe data is empty");
                }
                
                // Backend DTO exposes authorId and authorName; try to enrich with user/profile info
                let authorFollowers = 0;
                let authorAvatar = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop";
                const authorId = d.authorId || d.author?.id || 0;
                if (authorId) {
                  try {
                    const [authorStatsResp, userResp] = await Promise.allSettled([
                      getUserStatByUserId(authorId),
                      getUserById(authorId),
                    ]);

                    if (authorStatsResp.status === 'fulfilled' && authorStatsResp.value?.success && authorStatsResp.value.data) {
                      authorFollowers = authorStatsResp.value.data.followersCount || 0;
                    }

                    if (userResp.status === 'fulfilled' && userResp.value?.data) {
                      const u = userResp.value.data;
                      authorAvatar = u.profile?.url || u.profileUrl || u.avatar || authorAvatar;
                    }
                  } catch (err) {
                    console.warn("Failed to fetch author enrichment:", err);
                  }
                }

                // Normalize instructions, ingredients and comments into the shape expected by the UI
                const normalizeInstructions = (raw: any) => {
                  let arr = raw;
                  if (!arr) return [];
                  if (typeof arr === 'string') {
                    try { arr = JSON.parse(arr); } catch (e) { arr = []; }
                  }
                  return (Array.isArray(arr) ? arr : []).map((it: any, i: number) => ({
                    stepNumber: it.stepNumber ?? it.step_number ?? it.step ?? (i + 1),
                    content: it.stepDescription ?? it.step_description ?? it.step_description_text ?? it.content ?? "",
                  }));
                };

                const normalizeIngredients = (raw: any) => {
                  let arr = raw;
                  if (!arr) return [];
                  if (typeof arr === 'string') {
                    try { arr = JSON.parse(arr); } catch (e) { arr = []; }
                  }
                  return (Array.isArray(arr) ? arr : []).map((ing: any, i: number) => ({
                    name: ing.ingredientName ?? ing.ingredient_name ?? ing.name ?? ing.ingredient ?? "",
                    amount: ing.quantity ?? ing.amount ?? ing.qty ?? ing.quantity ?? "",
                    unit: ing.unit ?? ing.uom ?? ing.unit ?? "",
                    description: ing.ingredientDescription ?? ing.ingredient_description ?? ing.description ?? "",
                  }));
                };

                const normalizeComments = (raw: any) => {
                  let arr = raw;
                  if (!arr) return [];
                  if (typeof arr === 'string') {
                    try { arr = JSON.parse(arr); } catch (e) { arr = []; }
                  }
                  return (Array.isArray(arr) ? arr : []).map((c: any, i: number) => ({
                    id: c.id ?? `c-${i}`,
                    author: c.author ?? c.user ?? { displayName: c.authorName ?? c.username ?? 'Anonymous', profile: { url: c.authorProfileUrl ?? null }, username: c.username ?? null },
                    content: c.content ?? c.text ?? c.body ?? "",
                  }));
                };

                const normalizedInstructions = normalizeInstructions(d.instructions ?? d.steps ?? []);
                const normalizedIngredients = normalizeIngredients(d.ingredients ?? d.ingredientsList ?? []);
                const normalizedComments = normalizeComments(d.comments ?? d.commentsList ?? []);

                console.debug("[RecipeDetail] normalizedInstructions:", normalizedInstructions);
                console.debug("[RecipeDetail] normalizedIngredients:", normalizedIngredients);
                console.debug("[RecipeDetail] normalizedComments:", normalizedComments);

                setRecipe({
                  id: d.id,
                  title: d.title,
                  description: d.description,
                  image: d.media?.[0]?.url || d.image || "https://images.unsplash.com/photo-1612874742237-6526221fcfbb?w=800&h=600&fit=crop",
                  cuisine: d.cuisine,
                  difficulty: d.difficulty || d.difficultyLevel || "",
                  cookTime: d.cookTime ?? d.cook_time ?? 0,
                  prepTime: d.prepTime ?? d.prep_time ?? 0,
                  servings: d.servings ?? 0,
                  author: {
                    id: authorId || 0,
                    name: d.authorName || d.author?.displayName || "Unknown Chef",
                    avatar: authorAvatar,
                    followers: authorFollowers,
                  },
                  reactions: d.reactionsCount ?? d.likeCount ?? d.reactions ?? 0,
                  comments: normalizedComments,
                  ingredients: normalizedIngredients,
                  instructions: normalizedInstructions,
                });

                // Fetch similar recipes (ML-backed) for the current recipe id, then resolve full recipe details from Java backend
                (async () => {
                  try {
                    const simResp = await getSimilarRecipes({ recipe_id: parseInt(d.id), top_k: 6 });
                    const recs = simResp?.recommendations ?? simResp?.data ?? simResp ?? [];

                    // Normalize recommendations array to extract recipe IDs.
                    // ML may return numbers or objects with `id`, `recipe_id` or `recipeId`.
                    const recIds: number[] = (Array.isArray(recs) ? recs : []).map((r: any) => {
                      if (typeof r === 'number') return r;
                      return r?.id ?? r?.recipe_id ?? r?.recipeId ?? null;
                    }).filter((x: any) => x != null).map((x: any) => parseInt(x, 10)).filter(Boolean).slice(0, 6);

                    // Fetch full recipe details for each recommended id in parallel (skip failures)
                    const recDetails = await Promise.all(recIds.map(async (rid) => {
                      try {
                        const rr = await getRecipeById(rid);
                        const rd = rr?.data;
                        if (!rd) return null;
                        let authorFollowers = 0;
                        try {
                          const as = await getUserStatByUserId(rd.authorId || rd.author?.id || 0);
                          if (as?.success && as.data) authorFollowers = as.data.followersCount || 0;
                        } catch (e) {
                          // ignore author stat failures
                        }
                        return {
                          id: rd.id,
                          title: rd.title,
                          description: rd.description,
                          image: rd.media?.[0]?.url || rd.image || "https://images.unsplash.com/photo-1612874742237-6526221fcfbb?w=800&h=600&fit=crop",
                          cuisine: rd.cuisine,
                          difficulty: rd.difficulty,
                          cookTime: rd.cookTime,
                          prepTime: rd.prepTime,
                          servings: rd.servings,
                          author: {
                            id: rd.authorId || rd.author?.id || 0,
                            name: rd.authorName || rd.author?.displayName || "Unknown Chef",
                            avatar: rd.author?.profile?.url || rd.author?.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
                            followers: authorFollowers,
                          },
                          reactions: rd.reactionsCount ?? rd.likeCount ?? 0,
                          comments: rd.comments ?? [],
                          ingredients: rd.ingredients ?? [],
                          instructions: rd.instructions ?? [],
                        };
                      } catch (e) {
                        return null;
                      }
                    }));

                    const finalRecs = recDetails.filter(Boolean) as Recommendation[];
                    if (finalRecs.length > 0) {
                      setRecommendations(finalRecs.slice(0, 6));
                    } else {
                      setRecommendations(staticRecommendations);
                    }
                  } catch (rec_err) {
                    console.error("Failed to fetch similar recipes:", rec_err);
                    try {
                      // Fallback to Java backend: fetch recipes with same cuisine (or any useful filter)
                      const resp = await getCachedFilteredRecipes({ cuisine: d.cuisine || 'all', page: 0, size: 6 });
                      const raw = resp?.data?.content ?? resp?.content ?? resp?.data ?? resp ?? [];
                      const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.content) ? raw.content : []);
                      const mapped = arr.map((rd: any) => ({
                        id: rd.id,
                        title: rd.title,
                        description: rd.description,
                        image: rd.media?.[0]?.url || rd.image || "https://images.unsplash.com/photo-1612874742237-6526221fcfbb?w=800&h=600&fit=crop",
                        cuisine: rd.cuisine,
                        difficulty: rd.difficulty,
                        cookTime: rd.cookTime ?? rd.cook_time,
                        prepTime: rd.prepTime ?? rd.prep_time,
                        servings: rd.servings,
                        author: {
                          id: rd.authorId || rd.author?.id || 0,
                          name: rd.authorName || rd.author?.displayName || "Unknown Chef",
                          avatar: rd.author?.profile?.url || rd.author?.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
                          followers: rd.authorFollowers || 0,
                        },
                        reactions: rd.reactionsCount ?? rd.likeCount ?? rd.reactions ?? 0,
                        comments: rd.comments ?? rd.commentsCount ?? [],
                        ingredients: rd.ingredients ?? [],
                        instructions: rd.instructions ?? [],
                      }));
                      if (mapped.length > 0) setRecommendations(mapped.slice(0,6));
                      else setRecommendations(staticRecommendations);
                    } catch (fallbackErr) {
                      console.error("Fallback fetch for similar recipes failed:", fallbackErr);
                      setRecommendations(staticRecommendations);
                    }
                  }
                })();
            })
            .catch(err => {
                setError(`API error: ${err.message}. Loading static data.`);
                const staticRecipe = staticRecipeDetails.find(r => r.id === id);
                if (staticRecipe) {
                    setRecipe(staticRecipe);
                    setRecommendations(staticRecommendations);
                } else {
                    setError(`Recipe with ID ${id} not found in static data.`);
                }
            });
    }
  }, [id]);

  // Check if current user has saved this recipe already
  useEffect(() => {
    const checkSaved = async () => {
      if (!currentUser || !recipe) return;
      try {
        const resp = await getAllSavedItems(currentUser.id);
        const items = resp?.data ?? resp ?? [];
        const found = (items || []).find((it: any) => it.resourceType === 'RECIPE' && String(it.resourceId) === String(recipe.id));
        if (found) {
          setSaved(true);
          setSaveRecordId(found.id);
        } else {
          setSaved(false);
          setSaveRecordId(null);
        }
      } catch (e) {
        // ignore — saved state remains false
      }
    };
    checkSaved();
  }, [currentUser, recipe]);

  const handleLike = async () => {
    if (!recipe || liked || !currentUser) return;
    try {
        await likeRecipe({ recipeId: parseInt(recipe.id), reactionType: 'LIKE' });
        setLiked(true);
        setRecipe(r => r ? { ...r, reactions: r.reactions + 1 } : null);
    } catch (err: any) {
        setError("Failed to like recipe. Please try again.");
    }
  }

  const handleSave = async () => {
    if (!recipe || !currentUser) return;
    try {
        if (!saved) {
            const resp = await saveResource({ userId: currentUser.id, resourceType: 'RECIPE', resourceId: parseInt(recipe.id) });
            // If server returns saved item id, store it for potential unsave
            const savedId = resp?.data?.id ?? resp?.id ?? null;
            if (savedId) setSaveRecordId(Number(savedId));
            setSaved(true);
        } else {
            // unsave: call unsaveResource if we have the record id
            if (saveRecordId) {
                await unsaveResource(saveRecordId);
                setSaved(false);
                setSaveRecordId(null);
            } else {
                // fallback: refetch saved items and try remove the matching record
                const resp = await getAllSavedItems(currentUser.id);
                const items = resp?.data ?? resp ?? [];
                const found = (items || []).find((it: any) => it.resourceType === 'RECIPE' && String(it.resourceId) === String(recipe.id));
                if (found) {
                    await unsaveResource(found.id);
                }
                setSaved(false);
                setSaveRecordId(null);
            }
        }
    } catch (err: any) {
        setError("Failed to update saved state. Please try again.");
    }
  }

  // Share handler: Web Share API or clipboard fallback
  const handleShare = async () => {
    try {
      const url = window.location.href;
      const title = recipe?.title || 'Recipe';
      if (navigator.share) {
        await navigator.share({ title, url });
        setShareMessage('Shared successfully');
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setShareMessage('Link copied to clipboard');
      } else {
        // fallback alert
        window.prompt('Copy this link to share', url);
        setShareMessage('Link ready to copy');
      }
      setTimeout(() => setShareMessage(null), 3000);
    } catch (e) {
      setError('Failed to share recipe.');
    }
  }

  const handleFollow = async () => {
    if (!recipe || !currentUser) return;
    try {
        await followUser({ followerId: currentUser.id, followeeId: recipe.author.id });
        // Optionally, update UI to reflect followed state
    } catch (err: any) {
        setError("Failed to follow chef. Please try again.");
    }
  }

  // Text-to-Speech helpers
  const buildSpeechChunks = (r: Recipe) => {
    const chunks: string[] = [];
    chunks.push(r.title);
    if (r.description) chunks.push(r.description);
    chunks.push(`This recipe serves ${r.servings} and takes approximately ${r.prepTime + r.cookTime} minutes to make.`);
    if (r.ingredients && r.ingredients.length) {
      const ingText = r.ingredients.map(i => `${i.amount ?? ''} ${i.unit ?? ''} ${i.name}`).join('. ');
      chunks.push(`Ingredients: ${ingText}.`);
    }
    if (r.instructions && r.instructions.length) {
      r.instructions.forEach(inst => {
        chunks.push(`Step ${inst.stepNumber}: ${inst.content}`);
      });
    }
    return chunks;
  };

  const prepareUtterances = (r: Recipe) => {
    if (!synthRef) return null;
    const chunks = buildSpeechChunks(r);
    const voices = synthRef.getVoices ? synthRef.getVoices() : [];
    const preferred = voices.find((v: any) => /en/i.test(v.lang)) || voices[0] || null;
    const utterances: SpeechSynthesisUtterance[] = chunks.map((txt, idx) => {
      const u = new SpeechSynthesisUtterance(txt);
      u.rate = 1.02;
      u.pitch = 1.05;
      if (preferred) u.voice = preferred;
      u.onend = () => {
        if (idx === chunks.length - 1) {
          setIsSpeaking(false);
          setIsPaused(false);
        }
      };
      return u;
    });
    utterancesRef.current = utterances;
    return utterances;
  };

  const startSpeaking = (r: Recipe) => {
    if (!synthRef) {
      setError('Text-to-speech is not supported in this browser.');
      return;
    }
    if (synthRef.speaking && !synthRef.paused) return;
    if (synthRef.paused) {
      synthRef.resume();
      setIsPaused(false);
      setIsSpeaking(true);
      return;
    }
    const utterances = prepareUtterances(r);
    if (!utterances || utterances.length === 0) return;
    synthRef.cancel();
    utterances.forEach(u => synthRef.speak(u));
    setIsSpeaking(true);
    setIsPaused(false);
  };

  const togglePauseResume = () => {
    if (!synthRef) return;
    if (!synthRef.speaking) return;
    if (synthRef.paused) {
      synthRef.resume();
      setIsPaused(false);
    } else {
      synthRef.pause();
      setIsPaused(true);
    }
  };

  const stopSpeaking = () => {
    if (!synthRef) return;
    synthRef.cancel();
    utterancesRef.current = null;
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const handleAddComment = async () => {
      if (!recipe || !newComment.trim() || !currentUser) return;
      try {
          await addCommentToRecipe({ recipeId: parseInt(recipe.id), content: newComment });
          setNewComment("");
      } catch (err: any) {
          setError("Failed to add comment. Please try again.");
      }
  }

  if (error && !recipe) {
    return <MainLayout><div className="text-center py-20 text-red-500">Error: {error}</div></MainLayout>;
  }

  if (!recipe) {
    return <MainLayout><div className="text-center py-20">Loading recipe...</div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="relative h-96 sm:h-[500px] overflow-hidden bg-gray-900">
          <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
          <Card className="bg-white shadow-lg p-6 sm:p-8">
            {/* Header, Title, Description, Actions */}
             <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
              <div className="flex-1">
                <div className="flex gap-2 mb-3">
                  <Badge className="bg-orange-500 text-white">{recipe.difficulty}</Badge>
                  <Badge variant="outline">{recipe.cuisine}</Badge>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{recipe.title}</h1>
                <p className="text-gray-600 text-lg">{recipe.description}</p>
              </div>

              <div className="flex gap-3 sm:flex-col">
                <Button onClick={handleLike} variant="outline" className={`rounded-lg gap-2 ${liked ? 'bg-red-50 border-red-500 text-red-600' : 'text-gray-600'}`}>
                  <Heart className="h-5 w-5" fill={liked ? "currentColor" : "none"}/>
                  <span className="hidden sm:inline">{recipe.reactions}</span>
                </Button>
                <Button onClick={handleSave} variant="outline" className={`rounded-lg gap-2 ${saved ? 'bg-orange-50 border-orange-500 text-orange-600' : 'text-gray-600'}`}>
                  <Bookmark className="h-5 w-5" fill={saved ? "currentColor" : "none"}/>
                </Button>
                <Button onClick={() => { if (!isSpeaking) startSpeaking(recipe); else togglePauseResume(); }} variant="outline" className="rounded-lg gap-2 text-gray-600">
                  <Volume2 className="h-5 w-5" />
                  <span className="hidden sm:inline">{!isSpeaking ? 'Speak' : isPaused ? 'Resume' : 'Pause'}</span>
                </Button>
                {isSpeaking && (
                  <Button onClick={stopSpeaking} variant="ghost" className="rounded-lg gap-2 text-sm text-gray-600">Stop</Button>
                )}
                <Button onClick={handleShare} variant="outline" className="rounded-lg gap-2 text-gray-600">
                  <Share2 className="h-5 w-5" />
                </Button>
                {shareMessage && <div className="text-sm text-gray-600 mt-1">{shareMessage}</div>}
              </div>
            </div>
            {/* Key Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 border-t pt-6">
              <div><p className="text-gray-600 text-sm">Prep Time</p><p className="text-lg font-semibold text-gray-900">{recipe.prepTime} min</p></div>
              <div><p className="text-gray-600 text-sm">Cook Time</p><p className="text-lg font-semibold text-gray-900">{recipe.cookTime} min</p></div>
              <div><p className="text-gray-600 text-sm">Servings</p><p className="text-lg font-semibold text-gray-900">{recipe.servings}</p></div>
              <div><p className="text-gray-600 text-sm">Difficulty</p><p className="text-lg font-semibold text-gray-900">{recipe.difficulty}</p></div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column (Ingredients & Instructions) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Ingredients */}
              <Card className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Ingredients</h2>
                <ul className="space-y-3 list-disc list-inside">
                  {recipe.ingredients.map((ing, idx) => (
                    <li key={idx} className="text-gray-700"><span className="font-semibold">{ing.amount} {ing.unit}</span> {ing.name}</li>
                  ))}
                </ul>
              </Card>

              {/* Instructions */}
              <Card className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Instructions</h2>
                <div className="space-y-6">
                  {recipe.instructions.map((inst, idx) => (
                    <div key={idx} className="flex gap-4">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold flex items-center justify-center">{inst.stepNumber}</div>
                        <p className="text-gray-700 mt-2">{inst.content}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Comments */}
              <Card className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Comments ({recipe.comments.length})</h2>
                <div className="space-y-4 mb-6">
                  {recipe.comments.map((comment: any, idx: number) => (
                    <div key={comment.id ?? `comment-${idx}`} className="border-b pb-4 last:border-b-0">
                      <div className="flex gap-3">
                        <img src={comment.author.profile?.url || 'https://avatar.vercel.sh/' + comment.author.username} alt={comment.author.displayName} className="h-10 w-10 rounded-full object-cover" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{comment.author.displayName}</h3>
                          <p className="text-gray-600 mt-1">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-6 flex gap-2">
                    <Input placeholder="Add a public comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} className="flex-1"/>
                    <Button onClick={handleAddComment}><Send className="h-5 w-5"/></Button>
                </div>
              </Card>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              <Card className="p-6 text-center">
                <h3 className="text-lg font-bold text-gray-900 mb-4">About the Chef</h3>
                <img src={recipe.author.avatar} alt={recipe.author.name} className="h-24 w-24 rounded-full mx-auto mb-4 object-cover"/>
                <h4 className="font-bold text-gray-900">{recipe.author.name}</h4>
                <p className="text-sm text-gray-600">{recipe.author.followers.toLocaleString()} followers</p>
                <Button onClick={handleFollow} className="w-full mt-4 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white">Follow</Button>
              </Card>

                {/* Similar Recipes */}
                <Card className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><ChefHat className="h-5 w-5 text-orange-500" /> Similar Recipes</h3>
                    <div className="space-y-4">
                        {recommendations.map((rec, idx) => (
                          <Link to={`/recipes/${rec.id}`} key={`${rec.id ?? 'rec'}-${idx}`} className="block hover:bg-gray-100 rounded-lg p-2 transition-colors">
                                <div className="flex gap-4">
                                    <img src={rec.image} alt={rec.title} className="h-16 w-16 rounded-lg object-cover" />
                                    <div>
                                        <h4 className="font-semibold text-gray-900 leading-tight">{rec.title}</h4>
                                        <p className="text-sm text-gray-500">{rec.cuisine}</p>
                                        <p className="text-sm text-gray-500">{rec.reactions} Likes</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </Card>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
