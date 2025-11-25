import { useState, useEffect } from "react";
import { getCurrentUser, getRecipesByUser, deleteRecipe } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Recipe } from "@shared/api";

export default function MyRecipes() {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [error, setError] = useState<string | null>(null);
    const currentUser = getCurrentUser();

    const fetchRecipes = async () => {
        if (!currentUser) return;
        try {
            const response = await getRecipesByUser(currentUser.id);
            setRecipes(response.data);
        } catch (err: any) {
            setError("Failed to fetch your recipes.");
        }
    };

    useEffect(() => {
        fetchRecipes();
    }, [currentUser]);

    const handleDelete = async (recipeId: number) => {
        if (!confirm("Are you sure you want to delete this recipe?")) return;
        try {
            await deleteRecipe(recipeId);
            fetchRecipes(); // Refresh the list
        } catch (err: any) {
            setError("Failed to delete recipe.");
        }
    };

    return (
        <div className="mt-6">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">My Recipes</h2>
                <Button asChild>
                    <Link to="/recipes/create">Create Recipe</Link>
                </Button>
            </div>
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
                            <div className="flex justify-end gap-2 mt-4">
                                <Button asChild variant="outline" size="sm">
                                    <Link to={`/recipes/edit/${recipe.id}`}>Edit</Link>
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDelete(recipe.id)}>
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
                 {recipes.length === 0 && !error && (
                    <p>You haven't created any recipes yet.</p>
                )}
            </div>
        </div>
    );
}
