import { Link } from "react-router-dom";
import { ChefHat, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 py-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-lg">
                <ChefHat className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg">RecipeShare</span>
            </div>
            <p className="text-gray-400 text-sm">
              Share your culinary passion with the world. Discover, create, and
              inspire.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-orange-500">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-orange-500">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-orange-500">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-orange-500">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Recipes */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Recipes</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link to="/recipes" className="hover:text-orange-500">
                  Browse Recipes
                </Link>
              </li>
              <li>
                <Link to="/recipes/new" className="hover:text-orange-500">
                  Create Recipe
                </Link>
              </li>
              <li>
                <Link to="/recipes/trending" className="hover:text-orange-500">
                  Trending
                </Link>
              </li>
              <li>
                <Link
                  to="/recipes/categories"
                  className="hover:text-orange-500"
                >
                  Categories
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Community</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link to="/chefs" className="hover:text-orange-500">
                  Find Chefs
                </Link>
              </li>
              <li>
                <Link to="/feed" className="hover:text-orange-500">
                  Feed
                </Link>
              </li>
              <li>
                <Link to="/discover" className="hover:text-orange-500">
                  Discover
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-orange-500">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Legal</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="#" className="hover:text-orange-500">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-orange-500">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-orange-500">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-orange-500">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <p>&copy; 2024 RecipeShare. All rights reserved.</p>
            <p>
              Made with <span className="text-orange-500">♥</span> for food
              lovers worldwide
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
