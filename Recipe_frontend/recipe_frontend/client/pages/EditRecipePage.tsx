import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from 'lucide-react';


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
      ],
      tags: "pasta, italian, classic",
    },
  ];

const EditRecipePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const recipeToEdit = staticRecipeDetails.find(r => r.id === id);
    if (recipeToEdit) {
      setRecipe(recipeToEdit);
    } else {
      navigate('/profile');
    }
  }, [id, navigate]);

  const handleSave = () => {
    console.log('Saving recipe:', recipe, { files });
    alert('Recipe saved successfully!');
    navigate('/profile');
  };
  
  const handleAddIngredient = () => setRecipe(prev => ({...prev, ingredients: [...prev.ingredients, { name: "", amount: "", unit: "" }]}));
  const handleRemoveIngredient = (index) => setRecipe(prev => ({...prev, ingredients: prev.ingredients.filter((_, i) => i !== index)}));
  const handleIngredientChange = (index, field, value) => {
    const newIngredients = recipe.ingredients.map((ing, i) => i === index ? { ...ing, [field]: value } : ing);
    setRecipe(prev => ({ ...prev, ingredients: newIngredients }));
  };

  const handleAddInstruction = () => setRecipe(prev => ({...prev, instructions: [...prev.instructions, { content: "", stepNumber: prev.instructions.length + 1 }]}));
  const handleRemoveInstruction = (index) => setRecipe(prev => ({...prev, instructions: prev.instructions.filter((_, i) => i !== index)}));
  const handleInstructionChange = (index, value) => {
    const newInstructions = recipe.instructions.map((inst, i) => i === index ? { ...inst, content: value } : inst);
    setRecipe(prev => ({ ...prev, instructions: newInstructions }));
  }

  if (!recipe) {
    return <MainLayout><div>Loading...</div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-8">Edit Recipe</h1>
        <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-8">
          <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input placeholder="Recipe Title" value={recipe.title} onChange={e => setRecipe({...recipe, title: e.target.value})} required />
                <Textarea placeholder="A short description of your recipe" value={recipe.description} onChange={e => setRecipe({...recipe, description: e.target.value})} required />
              </div>
          </Card>

          <Card className="p-6">
             <h2 className="text-xl font-semibold mb-4">Recipe Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
               <Input placeholder="Cuisine" value={recipe.cuisine} onChange={e => setRecipe({...recipe, cuisine: e.target.value})} required />
               <Input placeholder="Difficulty" value={recipe.difficulty} onChange={e => setRecipe({...recipe, difficulty: e.target.value})} required />
               <Input type="number" placeholder="Prep Time (min)" value={recipe.prepTime} onChange={e => setRecipe({...recipe, prepTime: e.target.value})} required />
               <Input type="number" placeholder="Cook Time (min)" value={recipe.cookTime} onChange={e => setRecipe({...recipe, cookTime: e.target.value})} required />
               <Input type="number" placeholder="Servings" value={recipe.servings} onChange={e => setRecipe({...recipe, servings: e.target.value})} required />
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Ingredients</h2>
            {recipe.ingredients.map((ing, index) => (
              <div key={index} className="flex gap-4 mb-4 items-center">
                <Input placeholder="Name" value={ing.name} onChange={e => handleIngredientChange(index, 'name', e.target.value)} className="flex-1" />
                <Input type="number" placeholder="Amount" value={ing.amount} onChange={e => handleIngredientChange(index, 'amount', e.target.value)} className="w-24" />
                <Input placeholder="Unit" value={ing.unit} onChange={e => handleIngredientChange(index, 'unit', e.target.value)} className="w-24" />
                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveIngredient(index)}><Trash2 className="h-5 w-5 text-gray-500"/></Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={handleAddIngredient} className="gap-2"><Plus className="h-4 w-4"/> Add Ingredient</Button>
          </Card>
          
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Instructions</h2>
            {recipe.instructions.map((inst, index) => (
              <div key={index} className="flex gap-4 mb-4 items-start">
                <div className="font-semibold pt-2">{index + 1}.</div>
                <Textarea placeholder="Describe this step" value={inst.content} onChange={e => handleInstructionChange(index, e.target.value)} className="flex-1" />
                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveInstruction(index)}><Trash2 className="h-5 w-5 text-gray-500"/></Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={handleAddInstruction} className="gap-2"><Plus className="h-4 w-4"/> Add Step</Button>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Finishing Touches</h2>
             <div className="space-y-6">
                <Input placeholder="Tags (comma-separated)" value={recipe.tags} onChange={e => setRecipe({...recipe, tags: e.target.value})} />
                <div>
                    <label className="font-medium mb-2 block">Recipe Images</label>
                    <div className="flex items-center gap-4">
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>Select Images</Button>
                        {recipe.image && !files.length && <img src={recipe.image} alt="Current" className="h-16 w-16 object-cover rounded-lg"/>}
                    </div>
                    <input 
                        type="file" 
                        multiple 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={(e) => setFiles(Array.from(e.target.files || []))}
                        accept="image/*"
                    />
                    <div className="mt-2 text-sm text-gray-600">
                        {files.length > 0 ? `${files.length} new image(s) selected` : "No new images selected."}
                    </div>
                </div>
            </div>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/profile')}>Cancel</Button>
            <Button type="submit" size="lg">Save Changes</Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default EditRecipePage;
