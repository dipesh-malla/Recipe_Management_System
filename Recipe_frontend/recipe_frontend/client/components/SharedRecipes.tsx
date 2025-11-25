import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Recipe } from "@shared/api";

// MOCKED a function to get shared recipes
const getSharedRecipes = async (userId: number): Promise<{ data: Recipe[] }> => {
    console.log("Fetching shared recipes for user:", userId);
    // In a real app, this would be an API call.
    return Promise.resolve({ data: [] }); 
};

// MOCKED a function to unshare a recipe
const unshareRecipe = async (recipeId: number): Promise<void> => {
    console.log("Unsharing recipe:", recipeId);
    // In a real app, this would be an API call.
    return Promise.resolve();
};

export default function SharedRecipes() {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [error, setError] = useState<string | null>(null);
    const currentUser = getCurrentUser();

    const fetchSharedRecipes = async () => {
        if (!currentUser) return;
        try {
            const response = await getSharedRecipes(currentUser.id);
            setRecipes(response.data);
        } catch (err: any) {
            setError("Failed to fetch your shared recipes.");
        }
    };

    useEffect(() => {
        fetchSharedRecipes();
    }, [currentUser]);

    const handleUnshare = async (recipeId: number) => {
        if (!confirm("Are you sure you want to unshare this recipe?")) return;
        try {
            await unshareRecipe(recipeId);
            fetchSharedRecipes(); // Refresh the list
        } catch (err: any) {
            setError("Failed to unshare recipe.");
        }
    };

    return (
        <div className="mt-6">
            <h2 className="text-2xl font-bold mb-6">Shared Recipes</h2>
            {error && <p className="text-red-500 bg-red-100 p-3 rounded-lg mb-6">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recipes.map(recipe => (
                    <Card key={recipe.id} className="overflow-hidden">
                         <Link to={`/recipes/${recipe.id}`}>
                            <img src={recipe.media?.[0]?.url || 'https://via.placeholder.com/300'} alt={recipe.title} className="w-full h-48 object-cover" />
                        </Link>
                        <div className="p-4">
                            <h3 className="font-bold text-lg hover:underline">
                               <Link to={`/recipes/${recipe.id}`}>{recipe.title}</Link>
                            </h3>
                            <div className="flex justify-end mt-4">
                                <Button variant="secondary" size="sm" onClick={() => handleUnshare(recipe.id)}>
                                    Unshare
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
                {recipes.length === 0 && !error && (
                    <p>You haven't shared any recipes yet.</p>
                )}
            </div>
        </div>
    );
}
