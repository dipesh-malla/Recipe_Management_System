import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Bell, MessageSquare, User, LogOut, Menu, X, ChefHat } from "lucide-react";
import { useState, useEffect } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getCurrentUser, getUnreadNotificationsForUser, getConversations, isJavaBackendAvailable } from "@/lib/api";

const useUnreadCounts = (isLoggedIn: boolean) => {
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const currentUser = getCurrentUser();

    useEffect(() => {
        if (!isLoggedIn || !currentUser) return;

        const fetchCounts = async () => {
            // If Java backend is known to be down, avoid making network calls and show zeros
            if (!isJavaBackendAvailable()) {
                setUnreadNotifications(0);
                setUnreadMessages(0);
                return;
            }

            try {
                const notifResponse = await getUnreadNotificationsForUser(currentUser.id);
                // Backend returns array directly, or wrapped in {data: [...]}
                const notifications = Array.isArray(notifResponse) ? notifResponse : (notifResponse?.data || []);
                setUnreadNotifications(notifications.length);

                const convoResponse = await getConversations();
                // Backend returns array directly, or wrapped in {data: [...]}
                const conversations = Array.isArray(convoResponse) ? convoResponse : (convoResponse?.data || []);
                const totalUnreadMessages = conversations.reduce((sum: number, convo: any) => sum + (convo.unreadCount || 0), 0);
                setUnreadMessages(totalUnreadMessages);
            } catch (error) {
                // Don't spam the console with the same network error — the underlying API helpers return safe fallbacks.
                // Keep a single debug-level log for visibility.
                console.debug("Unread counts fetch failed (suppressed):", error?.message || error);
            }
        };

        fetchCounts();
        const interval = setInterval(fetchCounts, 60000); // Poll every minute

        return () => clearInterval(interval);
    }, [isLoggedIn, currentUser]);

    return { unreadNotifications, unreadMessages };
};

export default function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(!!getCurrentUser());
    const { unreadNotifications, unreadMessages } = useUnreadCounts(isLoggedIn);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const checkLoginStatus = () => {
            const user = getCurrentUser();
            setIsLoggedIn(!!user);
        };

        window.addEventListener('storage', checkLoginStatus);
        checkLoginStatus(); // Also check on component mount

        return () => {
            window.removeEventListener('storage', checkLoginStatus);
        };
    }, [location]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        navigate('/login');
        window.dispatchEvent(new Event('storage')); // Notify other tabs/components
    };

    const navItems = [
        { path: "/recipes", label: "Recipes" },
        { path: "/feed", label: "Feed" },
        { path: "/discover", label: "Discover" },
        { path: "/chefs", label: "Chefs" },
    ];

    const isActive = (path: string) => location.pathname === path;

    // Simpler search behaviour: user types, then presses Enter to search (like landing page).
    const [searchTerm, setSearchTerm] = useState((window as any)._headerSearchTerm || '');

    return (
        <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <Link to={isLoggedIn ? "/feed" : "/"} className="flex items-center gap-2 font-bold text-xl">
                        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-lg">
                            <ChefHat className="h-5 w-5 text-white" />
                        </div>
                        <span className="hidden sm:inline bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">RecipeShare</span>
                    </Link>

                    {isLoggedIn && (
                        <nav className="hidden md:flex items-center gap-1">
                            {navItems.map((item) => (
                                <Link key={item.path} to={item.path}>
                                    <Button variant={isActive(item.path) ? "secondary" : "ghost"} className={`rounded-full ${isActive(item.path) ? "font-semibold" : "text-gray-700 hover:text-orange-600"}`}>
                                        {item.label}
                                    </Button>
                                </Link>
                            ))}
                        </nav>
                    )}

                    <div className="hidden lg:flex items-center flex-1 max-w-md mx-8">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                value={searchTerm}
                                onChange={(e: any) => setSearchTerm(e.target.value)}
                                placeholder="Search recipes, chefs..."
                                className="pl-10 pr-4 rounded-full bg-gray-100 border-0 focus:bg-white focus:ring-2 focus:ring-orange-500"
                                onKeyDown={(e: any) => {
                                    if (e.key === 'Enter') {
                                        // Heuristic: if the user typed a likely chef/username query,
                                        // navigate directly to chef search. Else default to recipes.
                                        const term = (searchTerm || '').trim();
                                        const lower = term.toLowerCase();
                                        const isUserIdLike = /^user\s*\d+$/i.test(term);
                                        const isChefPrefix = /^chef\b/i.test(term);
                                        const isHandle = /^@\w+/.test(term);
                                        const section = (isUserIdLike || isChefPrefix || isHandle) ? 'chefs' : 'recipes';
                                        navigate(`/discover?search=${encodeURIComponent(term)}&section=${section}`);
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <Button variant="ghost" size="icon" className="lg:hidden text-gray-700 hover:text-orange-600">
                            <Search className="h-5 w-5" />
                        </Button>

                        {isLoggedIn ? (
                            <>
                                <Link to="/notifications">
                                    <Button variant="ghost" size="icon" className="relative text-gray-700 hover:text-orange-600">
                                        <Bell className="h-5 w-5" />
                                        {unreadNotifications > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">{unreadNotifications}</span>}
                                    </Button>
                                </Link>

                                <Link to="/messages">
                                    <Button variant="ghost" size="icon" className="relative text-gray-700 hover:text-orange-600">
                                        <MessageSquare className="h-5 w-5" />
                                        {unreadMessages > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">{unreadMessages}</span>}
                                    </Button>
                                </Link>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-gray-700 hover:text-orange-600"><User className="h-5 w-5" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem asChild><Link to="/profile" className="w-full flex items-center gap-2"><User className="h-4 w-4"/>My Profile</Link></DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleLogout}><button className="w-full text-left flex items-center gap-2 text-red-600"><LogOut className="h-4 w-4" />Logout</button></DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="hidden sm:block"><Button variant="ghost" className="text-gray-700 hover:text-orange-600">Sign In</Button></Link>
                                <Link to="/register"><Button className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md hover:from-orange-600 hover:to-red-600 transition-transform transform hover:scale-105">Sign Up</Button></Link>
                            </>
                        )}

                        {isLoggedIn && (
                            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {mobileMenuOpen && isLoggedIn && (
                <div className="md:hidden border-t border-gray-200 bg-white p-4 space-y-2">
                    {navItems.map((item) => (
                        <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)} className="block">
                            <Button variant={isActive(item.path) ? "secondary" : "ghost"} className="w-full justify-start font-medium">{item.label}</Button>
                        </Link>
                    ))}
                </div>
            )}
        </header>
    );
}
