import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useRef } from "react";
import { createRecipe } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from 'lucide-react';

export default function CreateRecipe() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [servings, setServings] = useState("");
  const [ingredients, setIngredients] = useState([{ name: "", amount: "", unit: "" }]);
  const [instructions, setInstructions] = useState([{ content: "", stepNumber: 1 }]);
  const [tags, setTags] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: "", amount: "", unit: "" }]);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleAddInstruction = () => {
    setInstructions([...instructions, { content: "", stepNumber: instructions.length + 1 }]);
  };

  const handleRemoveInstruction = (index: number) => {
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const recipeData = {
      title,
      description,
      cuisine,
      dietaryType: "None",
      servings: parseInt(servings, 10),
      cookTime: parseInt(cookTime, 10),
      prepTime: parseInt(prepTime, 10),
      difficulty,
      isPublic: true,
      ingredients: ingredients.map(ing => ({...ing, amount: parseInt(ing.amount, 10)})),
      instructions,
      tags: tags.split(",").map(tag => tag.trim()),
    };

    try {
      await createRecipe(recipeData, files);
      navigate("/recipes");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">Create a New Recipe</h1>
        <form onSubmit={handleSubmit} className="space-y-8">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input placeholder="Recipe Title" value={title} onChange={e => setTitle(e.target.value)} required />
              <Textarea placeholder="A short description of your recipe" value={description} onChange={e => setDescription(e.target.value)} required />
            </div>
          </Card>

          <Card className="p-6">
             <h2 className="text-xl font-semibold mb-4">Recipe Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <Select onValueChange={setCuisine} required>
                <SelectTrigger><SelectValue placeholder="Cuisine" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="Italian">Italian</SelectItem>
                    <SelectItem value="Thai">Thai</SelectItem>
                    <SelectItem value="Japanese">Japanese</SelectItem>
                    <SelectItem value="Mediterranean">Mediterranean</SelectItem>
                    <SelectItem value="French">French</SelectItem>
                    <SelectItem value="Fusion">Fusion</SelectItem>
                </SelectContent>
              </Select>
              <Select onValueChange={setDifficulty} required>
                <SelectTrigger><SelectValue placeholder="Difficulty" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" placeholder="Prep Time (min)" value={prepTime} onChange={e => setPrepTime(e.target.value)} required />
              <Input type="number" placeholder="Cook Time (min)" value={cookTime} onChange={e => setCookTime(e.target.value)} required />
              <Input type="number" placeholder="Servings" value={servings} onChange={e => setServings(e.target.value)} required />
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Ingredients</h2>
            {ingredients.map((ing, index) => (
              <div key={index} className="flex gap-4 mb-4 items-center">
                <Input placeholder="Name" value={ing.name} onChange={e => setIngredients(ings => ings.map((i, idx) => idx === index ? {...i, name: e.target.value} : i))} className="flex-1" />
                <Input type="number" placeholder="Amount" value={ing.amount} onChange={e => setIngredients(ings => ings.map((i, idx) => idx === index ? {...i, amount: e.target.value} : i))} className="w-24" />
                <Input placeholder="Unit" value={ing.unit} onChange={e => setIngredients(ings => ings.map((i, idx) => idx === index ? {...i, unit: e.target.value} : i))} className="w-24" />
                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveIngredient(index)}><Trash2 className="h-5 w-5 text-gray-500"/></Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={handleAddIngredient} className="gap-2"><Plus className="h-4 w-4"/> Add Ingredient</Button>
          </Card>
          
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Instructions</h2>
            {instructions.map((inst, index) => (
              <div key={index} className="flex gap-4 mb-4 items-center">
                <div className="font-semibold">{index + 1}.</div>
                <Textarea placeholder="Describe this step" value={inst.content} onChange={e => setInstructions(instrs => instrs.map((i, idx) => idx === index ? {...i, content: e.target.value} : i))} className="flex-1" />
                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveInstruction(index)}><Trash2 className="h-5 w-5 text-gray-500"/></Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={handleAddInstruction} className="gap-2"><Plus className="h-4 w-4"/> Add Step</Button>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Finishing Touches</h2>
             <div className="space-y-6">
                <Input placeholder="Tags (comma-separated, e.g., pasta, quick, vegetarian)" value={tags} onChange={e => setTags(e.target.value)} />
                <div>
                    <label className="font-medium mb-2 block">Recipe Images</label>
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>Select Images</Button>
                    <input 
                        type="file" 
                        multiple 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={(e) => setFiles(Array.from(e.target.files || []))}
                        accept="image/*"
                    />
                    <div className="mt-2 text-sm text-gray-600">
                        {files.length > 0 ? `${files.length} image(s) selected` : "No images selected."}
                    </div>
                </div>
            </div>
          </Card>

          {error && <p className="text-red-500 bg-red-100 p-3 rounded-lg">Error: {error}</p>}

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? "Submitting..." : "Create Recipe"}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
