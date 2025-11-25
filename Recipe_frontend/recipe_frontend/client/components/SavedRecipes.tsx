import { useState, useEffect } from "react";
import { getCurrentUser, getAllSavedItems, unsaveResource } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SavedItem, Recipe } from "@shared/api";

export default function SavedRecipes() {
    const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const currentUser = getCurrentUser();

    const fetchSavedItems = async () => {
        if (!currentUser) return;
        try {
            const response = await getAllSavedItems(currentUser.id);
            setSavedItems(response.data);
        } catch (err: any) {
            setError("Failed to fetch your saved recipes.");
        }
    };

    useEffect(() => {
        fetchSavedItems();
    }, [currentUser]);

    const handleUnsave = async (saveId: number) => {
        if (!confirm("Are you sure you want to unsave this item?")) return;
        try {
            await unsaveResource(saveId);
            fetchSavedItems(); // Refresh the list
        } catch (err: any) {
            setError("Failed to unsave item.");
        }
    };

    // Filter for saved recipes and use a type guard for type safety
    const savedRecipes = savedItems.filter(
        (item): item is SavedItem & { resource: Partial<Recipe> } => item.resourceType === 'RECIPE'
    );

    return (
        <div className="mt-6">
            <h2 className="text-2xl font-bold mb-6">Saved Recipes</h2>
            {error && <p className="text-red-500 bg-red-100 p-3 rounded-lg mb-6">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedRecipes.map(item => (
                    <Card key={item.id} className="overflow-hidden">
                         <Link to={`/recipes/${item.resourceId}`}>
                            <img 
                                src={item.resource?.media?.[0]?.url || 'https://via.placeholder.com/300'} 
                                alt={item.resource?.title || "Saved recipe"} 
                                className="w-full h-48 object-cover" 
                            />
                        </Link>
                        <div className="p-4">
                            <h3 className="font-bold text-lg hover:underline">
                                 <Link to={`/recipes/${item.resourceId}`}>{item.resource?.title || "Untitled Recipe"}</Link>
                            </h3>
                             <p className="text-sm text-gray-500">Saved on {new Date(item.createdDate).toLocaleDateString()}</p>
                            <div className="flex justify-end mt-4">
                                <Button variant="secondary" size="sm" onClick={() => handleUnsave(item.id)}>
                                    Unsave
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
                {savedRecipes.length === 0 && !error && (
                    <p>You haven't saved any recipes yet.</p>
                )}
            </div>
        </div>
    );
}
