import { useState, useEffect } from "react";
import { getCurrentUser, getAllSavedItems, unsaveResource, getRecipeById } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SavedItem, Recipe } from "@shared/api";

export default function SavedRecipes({ userId: propUserId }: { userId?: number } = {}) {
    const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const currentUser = getCurrentUser();

    const fetchSavedItems = async () => {
        const userIdToUse = propUserId ?? currentUser?.id;
        if (!userIdToUse) return;
        try {
            const response = await getAllSavedItems(userIdToUse);
            const items: SavedItem[] = response?.data ?? [];

            // For saved recipes, fetch recipe details so UI can show title/media
            const enhanced = await Promise.all(items.map(async (it) => {
                if (it.resourceType === 'RECIPE' && it.resourceId) {
                    try {
                        const r = await getRecipeById(it.resourceId);
                        it.resource = r?.data ?? r ?? it.resource;
                    } catch (e) {
                        // ignore and leave resource undefined
                    }
                }
                return it;
            }));

            setSavedItems(enhanced);
        } catch (err: any) {
            setError("Failed to fetch your saved recipes.");
        }
    };

    useEffect(() => {
        fetchSavedItems();
    }, [currentUser, propUserId]);

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
        (item): item is SavedItem & { resource?: Partial<Recipe> } => item.resourceType === 'RECIPE'
    );

    const resolveImage = (resource?: Partial<Recipe>, resourceId?: number) => {
        if (!resource) return `https://placehold.co/400x300/e2e8f0/64748b?text=${encodeURIComponent('No Image')}`;
        // Common fields used by different endpoints
        const candidates = [
            // normalized by getRecipeById mapping
            (resource as any).image,
            (resource as any).imageUrl,
            // some endpoints use media: [{ url }]
            Array.isArray((resource as any).media) && (resource as any).media[0]?.url,
            // older shapes
            Array.isArray((resource as any).images) && (resource as any).images[0]?.url,
            // fallback to author-provided placeholder
            (resource as any).thumbnail || (resource as any).img || null,
        ];
        for (const c of candidates) {
            if (typeof c === 'string' && c.trim()) return c;
        }
        // finally try a generated placeholder using id
        return `https://placehold.co/400x300/e2e8f0/64748b?text=${encodeURIComponent(String(resource?.title || `Recipe ${resourceId || ''}`))}`;
    };

    const PLACEHOLDER = `https://placehold.co/400x300/e2e8f0/64748b?text=${encodeURIComponent('No Image')}`;

    return (
        <div className="mt-6">
            <h2 className="text-2xl font-bold mb-6">Saved Recipes</h2>
            {error && <p className="text-red-500 bg-red-100 p-3 rounded-lg mb-6">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedRecipes.map(item => (
                    <Card key={item.id} className="overflow-hidden">
                         <Link to={`/recipes/${item.resourceId}`}>
                            <img
                                src={resolveImage(item.resource, item.resourceId)}
                                alt={item.resource?.title || "Saved recipe"}
                                className="w-full h-48 object-cover"
                                loading="lazy"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER; }}
                            />
                        </Link>
                        <div className="p-4">
                               <h3 className="font-bold text-lg hover:underline">
                                   <Link to={`/recipes/${item.resourceId}`}>{item.resource?.title || `Recipe ${item.resourceId}` || "Untitled Recipe"}</Link>
                               </h3>
                                <p className="text-sm text-gray-500">Saved on {new Date(item.createdAt || (item.createdAT as any) || item.createdDate || Date.now()).toLocaleDateString()}</p>
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
