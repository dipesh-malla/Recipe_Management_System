import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Feed from "./pages/Feed";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RecipeBrowse from "./pages/RecipesBrowse";
import RecipeDetail from "./pages/RecipeDetail";
import CreateRecipe from "./pages/CreateRecipe";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import MyProfile  from "./pages/MyProfile";
import NotFound from "./pages/NotFound";
import EditRecipePage from "./pages/EditRecipePage";
import RecipeDetailPage from "./pages/RecipeDetailPage";
import SystemStatus from "./pages/SystemStatus";
import ChefsDiscovery from "./pages/ChefsDiscovery";
import UserProfilePage from "./pages/UserProfilePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/recipes" element={<RecipeBrowse />} />
          <Route path="/recipe/:id" element={<RecipeDetail />} />
          <Route path="/create-recipe" element={<CreateRecipe />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/profile" element={<MyProfile />} />
          <Route path="/profile/:userId" element={<UserProfilePage />} />
          <Route path="/chefs" element={<ChefsDiscovery />} />
          <Route path="/recipes/edit/:id" element={<EditRecipePage />} /> 
          <Route path="/recipe/:id" element={<RecipeDetailPage />} />
          <Route path="/system-status" element={<SystemStatus />} />




          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL \"*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
