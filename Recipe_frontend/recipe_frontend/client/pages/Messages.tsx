import MainLayout from "@/components/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { getCurrentUser, getConversations, getMessages, sendMessage, markMessagesAsRead, getFollowing } from "@/lib/api";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { Send, Search, MessageCircle } from "lucide-react";
import { Conversation, Message } from "@shared/api";

const staticConversations: Conversation[] = [
    {
        id: 1,
        participant: { id: 2, displayName: "Chef Priya", profile: { url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" } },
        lastMessage: { id: 1, sender: {id: 2, displayName: "Chef Priya", profile: {url: ""}}, receiver: {id: 1, displayName: "", profile: {url: ""}}, body: "Hey, I loved your latest recipe!", createdDate: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), read: false },
        unreadCount: 1,
    },
    {
        id: 2,
        participant: { id: 3, displayName: "Chef Takeshi", profile: { url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop" } },
        lastMessage: { id: 2, sender: {id: 1, displayName: "", profile: {url: ""}}, receiver: {id: 3, displayName: "", profile: {url: ""}}, body: "Thanks for the follow!", createdDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), read: true },
        unreadCount: 0,
    },
];

const staticMessages: Message[] = [
    { id: 1, sender: { id: 2, displayName: "Chef Priya", profile: { url: "" } }, receiver: {id: 1, displayName: "", profile: {url: ""}}, body: "Hey, I loved your latest recipe!", createdDate: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), read: false },
    { id: 2, sender: { id: 1, displayName: "You", profile: { url: "" } }, receiver: {id: 2, displayName: "", profile: {url: ""}}, body: "Thank you so much! I am glad you enjoyed it.", createdDate: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(), read: true },
];

export default function Messages() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [following, setFollowing] = useState<any[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [error, setError] = useState<string | null>(null);
    // Keep a stable reference for the current user so effects don't re-run on every render
    const [currentUser] = useState(() => getCurrentUser());

    useEffect(() => {
        const fetchConversations = async () => {
            if (!currentUser) {
                setError("You must be logged in to view messages.");
                setConversations(staticConversations);
                return;
            }
            try {
                const response = await getConversations(currentUser?.id);
                // response might be a GlobalApiResponse or an array fallback
                const convsRaw = response?.data ?? (Array.isArray(response) ? response : []);
                const convs = (convsRaw || []).map((c: any) => ({
                    id: c.conversationId ?? c.id ?? 0,
                    participant: { id: c.otherUserId ?? c.participant?.id ?? 0, displayName: c.otherUserName ?? c.participant?.displayName ?? 'Unknown', profile: { url: c.participant?.profile?.url || `https://i.pravatar.cc/150?u=${c.otherUserId ?? 0}` } },
                    lastMessage: { id: 0, sender: { id: c.otherUserId ?? 0, displayName: c.otherUserName ?? '' }, receiver: { id: currentUser?.id, displayName: 'You' }, body: c.lastMessage ?? '', createdDate: c.lastMessageTime ?? new Date().toISOString(), read: true },
                    unreadCount: c.unreadCount ?? 0,
                } as Conversation));
                setConversations(convs);
            } catch (err: any) {
                setError(`Failed to fetch conversations: ${err.message}. Displaying static data.`);
                setConversations(staticConversations);
            }
        };
        fetchConversations();
    }, [currentUser?.id]);

    // Fetch the first 3 users the current user is following for quick messaging
    useEffect(() => {
        const fetchFollowing = async () => {
            if (!currentUser) return;
            try {
                const resp = await getFollowing(currentUser.id);
                const list = resp?.data ?? [];
                setFollowing(Array.isArray(list) ? list.slice(0, 3) : []);
            } catch (e) {
                // fallback: empty
                setFollowing([]);
            }
        };
        fetchFollowing();
    }, [currentUser?.id]);

    useEffect(() => {
        if (selectedConversation && currentUser) {
            const fetchMessages = async () => {
                try {
                    const response = await getMessages(selectedConversation.participant.id);
                    // response may be an array of MessageDTO or a wrapped object; normalize to UI Message shape
                    const raw = response?.data ?? (Array.isArray(response) ? response : []);
                    const normalized = (raw || []).map((m: any) => ({
                        id: m.id,
                        sender: m.sender ? m.sender : { id: m.senderId, displayName: m.senderName, profile: { url: '' } },
                        receiver: m.receiver ? m.receiver : { id: m.receiverId, displayName: '', profile: { url: '' } },
                        body: m.body,
                        createdDate: m.sentAt ?? m.createdDate ?? new Date().toISOString(),
                        read: m.isRead ?? false,
                    }));
                    setMessages(normalized);
                    if (selectedConversation.unreadCount > 0) {
                        await markMessagesAsRead(selectedConversation.participant.id);
                        setConversations(prev => prev.map(c => c.id === selectedConversation.id ? { ...c, unreadCount: 0 } : c));
                    }
                } catch (err: any) {
                    setError(`Failed to fetch messages: ${err.message}. Displaying static data.`);
                    setMessages(staticMessages);
                }
            };
            fetchMessages();
        }
    // Only refetch messages when selected conversation participant id changes or current user id changes
    }, [selectedConversation?.participant?.id, currentUser?.id]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation || !currentUser) return;
        try {
            await sendMessage({ receiverId: selectedConversation.participant.id, body: newMessage });
            setNewMessage("");
            const optimisticMessage: Message = { 
                id: Date.now(), 
                sender: { id: currentUser.id, displayName: "You", profile: { url: "" } },
                receiver: selectedConversation.participant,
                body: newMessage, 
                createdDate: new Date().toISOString(),
                read: true
            };
            setMessages(prev => [...prev, optimisticMessage]);
        } catch (err: any) {
            setError(`Failed to send message: ${err.message}`);
        }
    };

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Messages</h1>
                {error && <p className="text-red-500 bg-red-100 p-3 rounded-lg mb-4">{error}</p>}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="md:col-span-1 p-0">
                        <div className="p-4 border-b">
                            <Input placeholder="Search conversations..." />
                            <div className="mt-3 flex gap-3">
                                {following && following.length > 0 ? (
                                    following.map((u: any) => (
                                        <button key={u.id} onClick={() => setSelectedConversation({ id: 0, participant: { id: u.id, displayName: u.displayName || u.username, profile: { url: u.profile || u.profileUrl || `https://i.pravatar.cc/150?u=${u.id}` } }, lastMessage: { id: 0, sender: { id: u.id, displayName: u.displayName }, receiver: { id: currentUser?.id, displayName: 'You' }, body: '', createdDate: new Date().toISOString(), read: true }, unreadCount: 0 } as Conversation)} className="flex flex-col items-center text-sm">
                                            <img src={u.profile || u.profileUrl || `https://i.pravatar.cc/150?u=${u.id}`} alt={u.displayName || u.username || 'User'} className="h-10 w-10 rounded-full object-cover" />
                                            <span className="mt-1 text-xs">{u.displayName || u.username}</span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="text-sm text-gray-500">No quick contacts</div>
                                )}
                            </div>
                        </div>
                        <ul className="divide-y divide-gray-200">
                            {conversations.map(convo => (
                                <li key={convo.id} onClick={() => setSelectedConversation(convo)} className={`p-4 flex gap-4 cursor-pointer ${selectedConversation?.id === convo.id ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                                    <img src={convo.participant.profile.url} alt={convo.participant.displayName} className="h-12 w-12 rounded-full object-cover" />
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between">
                                            <h3 className="font-bold text-gray-900 truncate">{convo.participant.displayName}</h3>
                                            <p className="text-xs text-gray-500 flex-shrink-0">{formatDistanceToNow(new Date(convo.lastMessage.createdDate), { addSuffix: true })}</p>
                                        </div>
                                        <p className={`text-sm ${convo.unreadCount > 0 ? 'text-gray-900 font-bold' : 'text-gray-600'} truncate`}>{convo.lastMessage.body}</p>
                                    </div>
                                    {convo.unreadCount > 0 && <div className="h-3 w-3 rounded-full bg-orange-500 self-center flex-shrink-0"></div>}
                                </li>
                            ))}
                        </ul>
                    </Card>

                    <Card className="md:col-span-2 flex flex-col">
                        {selectedConversation ? (
                            <>
                                <div className="p-4 border-b flex items-center gap-4">
                                    <img src={selectedConversation.participant.profile.url} alt={selectedConversation.participant.displayName} className="h-10 w-10 rounded-full object-cover" />
                                    <h2 className="text-xl font-bold text-gray-900">{selectedConversation.participant.displayName}</h2>
                                </div>
                                <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-gray-50/50">
                                    {messages.map(msg => (
                                        <div key={msg.id} className={`flex ${msg.sender.id === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-xs lg:max-w-md p-3 rounded-2xl ${msg.sender.id === currentUser?.id ? 'bg-orange-500 text-white' : 'bg-white text-gray-800 shadow-sm'}`}>
                                                <p>{msg.body}</p>
                                                <p className={`text-xs mt-1 ${msg.sender.id === currentUser?.id ? 'text-orange-100' : 'text-gray-500'} text-right`}>{format(new Date(msg.createdDate), 'p')}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 border-t flex gap-2 bg-white">
                                    <Input placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} />
                                    <Button onClick={handleSendMessage}><Send className="h-5 w-5" /></Button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                <MessageCircle className="h-16 w-16 text-gray-300" />
                                <h2 className="mt-4 text-xl font-semibold text-gray-900">Select a conversation</h2>
                                <p className="mt-1 text-gray-500">Choose a conversation from the left to start chatting.</p>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </MainLayout>
    );
}
