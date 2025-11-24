import { useParams, Link } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Users, Soup, Heart, MessageCircle } from 'lucide-react';

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
    // ... other recipes
  ];

const RecipeDetailPage = () => {
  const { id } = useParams();
  const recipe = staticRecipeDetails.find((r) => r.id === id);

  if (!recipe) {
    return <MainLayout><div>Recipe not found</div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
            <img src={recipe.image} alt={recipe.title} className="w-full h-96 object-cover rounded-lg shadow-lg"/>
        </div>

        <h1 className="text-4xl font-bold mb-4">{recipe.title}</h1>
        
        <div className="flex items-center mb-6 text-gray-600">
            <div className="flex items-center mr-6">
                <Soup className="mr-2"/>
                <span>{recipe.cuisine}</span>
            </div>
            <div className="flex items-center mr-6">
                <Clock className="mr-2"/>
                <span>{recipe.cookTime} min cook time</span>
            </div>
            <div className="flex items-center">
                <Users className="mr-2"/>
                <span>{recipe.servings} servings</span>
            </div>
        </div>

        <p className="text-lg mb-8">{recipe.description}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
                <Card>
                    <CardHeader><CardTitle>Instructions</CardTitle></CardHeader>
                    <CardContent>
                        <ol className="list-decimal list-inside space-y-4">
                            {recipe.instructions.map(step => (
                                <li key={step.stepNumber}>{step.content}</li>
                            ))}
                        </ol>
                    </CardContent>
                </Card>
            </div>
            <div>
                <Card>
                    <CardHeader><CardTitle>Ingredients</CardTitle></CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {recipe.ingredients.map(ing => (
                                <li key={ing.name} className="flex justify-between">
                                    <span>{ing.name}</span>
                                    <span>{ing.amount} {ing.unit}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Comments</h2>
          <div className="space-y-4">
            {recipe.comments.map(comment => (
              <div key={comment.id} className="flex items-start space-x-4">
                <Avatar>
                  <AvatarImage src={comment.author.profile.url} />
                  <AvatarFallback>{comment.author.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{comment.author.displayName}</p>
                  <p>{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </MainLayout>
  );
};

export default RecipeDetailPage;
