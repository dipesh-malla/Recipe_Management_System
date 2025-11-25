import MainLayout from "@/components/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { getCurrentUser, getNotificationsForUser, markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/api";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Bell, Heart, MessageCircle, UserPlus, CheckCheck } from "lucide-react";
import { Notification } from "@shared/api";

const staticNotifications: Notification[] = [
    {
        id: 101,
        actor: { id: 2, displayName: "Chef Priya", profile: { url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" } },
        verb: "liked",
        object: { type: "recipe", id: 11, content: "Lemon Herb Chicken" },
        isRead: false,
        createdDate: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    },
    {
        id: 102,
        actor: { id: 3, displayName: "Chef Takeshi", profile: { url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop" } },
        verb: "commented on",
        object: { type: "recipe", id: 11, content: "Lemon Herb Chicken" },
        isRead: false,
        createdDate: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    },
    {
        id: 103,
        actor: { id: 4, displayName: "Chef Sofia", profile: { url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop" } },
        verb: "started following you",
        object: { type: "user", id: 4, content: "" },
        isRead: true,
        createdDate: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
        id: 104,
        actor: { id: 5, displayName: "FoodieAnna", profile: { url: "https://i.pravatar.cc/100?u=anna" } },
        verb: "saved your recipe",
        object: { type: "recipe", id: 12, content: "Vegan Buddha Bowl" },
        isRead: false,
        createdDate: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
    {
        id: 105,
        actor: { id: 6, displayName: "Chef Luca", profile: { url: "https://i.pravatar.cc/100?u=luca" } },
        verb: "mentioned you in a comment",
        object: { type: "recipe", id: 15, content: "Smoky Eggplant Dip" },
        isRead: false,
        createdDate: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
        id: 106,
        actor: { id: 7, displayName: "Marin", profile: { url: "https://i.pravatar.cc/100?u=marin" } },
        verb: "replied to your comment",
        object: { type: "recipe", id: 11, content: "Lemon Herb Chicken" },
        isRead: true,
        createdDate: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    },
];

const NotificationIcon = ({ verb }: { verb: string }) => {
    switch (verb) {
        case 'liked': return <Heart className="h-6 w-6 text-red-500" />;
        case 'commented on': return <MessageCircle className="h-6 w-6 text-blue-500" />;
        case 'started following you': return <UserPlus className="h-6 w-6 text-green-500" />;
        default: return <Bell className="h-6 w-6 text-gray-500" />;
    }
};

export default function Notifications() {
    // Start with the static demo notifications so the page shows content immediately
    const [notifications, setNotifications] = useState<Notification[]>(staticNotifications);
    const [error, setError] = useState<string | null>(null);
    const currentUser = getCurrentUser();

    useEffect(() => {
        const fetchNotifications = async () => {
            if (!currentUser) {
                setError("You must be logged in to view notifications.");
                setNotifications(staticNotifications ?? []);
                return;
            }
            try {
                const response = await getNotificationsForUser(currentUser.id);
                // guard against unexpected API shapes; if API returns empty list, show demo static notifications
                const data = response?.data;
                if (Array.isArray(data) && data.length > 0) {
                    setNotifications(data);
                } else {
                    // fallback to demo notifications
                    setNotifications(staticNotifications);
                }
            } catch (err: any) {
                setError(`Failed to fetch notifications: ${err?.message || err}. Displaying static data.`);
                setNotifications(staticNotifications);
            }
        };
        fetchNotifications();
    }, [currentUser]);

    const handleMarkAsRead = async (id: number) => {
        try {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            await markNotificationAsRead(id);
        } catch (err: any) {
            setError(`Failed to mark notification as read: ${err.message}`);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!currentUser) return;
        try {
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            await markAllNotificationsAsRead(currentUser.id);
        } catch (err: any) {
            setError(`Failed to mark all notifications as read: ${err.message}`);
        }
    };

    return (
        <MainLayout>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
                    <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} disabled={!currentUser || (notifications?.every ? notifications.every(n => n.isRead) : true)}>
                        <CheckCheck className="h-4 w-4 mr-2" />
                        Mark all as read
                    </Button>
                </div>
                {error && <p className="text-red-500 bg-red-100 p-3 rounded-lg mb-4">{error}</p>}
                <Card className="p-0">
                    <ul className="divide-y divide-gray-200">
                        {notifications.map(notification => (
                            <li key={notification.id} onClick={() => !notification.isRead && handleMarkAsRead(notification.id)} className={`p-4 flex items-start gap-4 ${!notification.isRead ? 'bg-orange-50/50 cursor-pointer' : 'bg-white'}`}>
                                <NotificationIcon verb={notification.verb} />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <img src={notification.actor?.profile?.url || 'https://avatar.vercel.sh/' + notification.actor?.id} alt={notification.actor?.displayName || 'User'} className="h-10 w-10 rounded-full object-cover" />
                                        <p className="text-gray-700">
                                            <Link to={`/user/${notification.actor.id}`} className="font-bold hover:underline">{notification.actor.displayName}</Link>
                                            {` ${notification.verb} `}
                                            {notification.object && notification.object.type !== 'user' && 
                                                <Link to={`/${notification.object.type}/${notification.object.id}`} className="font-bold hover:underline">{notification.object.content}</Link>
                                            }
                                        </p>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {formatDistanceToNow(new Date(notification.createdDate), { addSuffix: true })}
                                    </p>
                                </div>
                                {!notification.isRead && <div className="h-3 w-3 rounded-full bg-orange-500 self-center"></div>}
                            </li>
                        ))}
                    </ul>
                </Card>
                {notifications.length === 0 && !error && (
                    <div className="text-center py-16">
                        <Bell className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
                        <p className="mt-1 text-sm text-gray-500">You don't have any notifications yet.</p>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
