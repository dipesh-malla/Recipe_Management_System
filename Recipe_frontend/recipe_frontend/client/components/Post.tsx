import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, Bookmark, UserPlus, Check } from "lucide-react";
import { Post as PostType } from "@shared/api";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser, followUser, checkIfFollowing } from "@/lib/api";

interface PostProps {
    post: PostType;
}

export default function Post({ post }: PostProps) {
    const [isFollowed, setIsFollowed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const currentUser = getCurrentUser();

    useEffect(() => {
        if (!currentUser) {
            setIsLoading(false);
            return;
        }

        const checkFollowingStatus = async () => {
            try {
                const response = await checkIfFollowing(currentUser.id, post.author.id);
                setIsFollowed(response.data);
            } catch (error) {
                console.error("Failed to check following status:", error);
            } finally {
                setIsLoading(false);
            }
        };

        checkFollowingStatus();
    }, [currentUser, post.author.id]);

    const handleFollow = async () => {
        if (!currentUser || isFollowed) return;
        try {
            await followUser({ followerId: currentUser.id, followeeId: post.author.id });
            setIsFollowed(true);
        } catch (error) {
            console.error("Failed to follow user:", error);
        }
    };

    return (
        <Card className="overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b">
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={post.author.profile?.url} alt={post.author.displayName} />
                        <AvatarFallback>{post.author.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <Link to={`/user/${post.author.id}`} className="font-bold hover:underline">
                            {post.author.displayName}
                        </Link>
                        <p className="text-xs text-gray-500">{new Date(post.createdDate).toLocaleDateString()}</p>
                    </div>
                </div>
                {currentUser && currentUser.id !== post.author.id && (
                    <Button variant={isFollowed ? "default" : "outline"} size="sm" onClick={handleFollow} disabled={isLoading || isFollowed}>
                        {isFollowed ? (
                            <><Check className="h-4 w-4 mr-2" /> Followed</>
                        ) : (
                            <><UserPlus className="h-4 w-4 mr-2" /> Follow</>
                        )}
                    </Button>
                )}
            </div>

            {post.media && post.media.length > 0 && (
                <img src={post.media[0].url} alt="Post content" className="w-full h-auto object-cover" />
            )}

            <div className="p-4">
                <p className="text-gray-800 mb-4">{post.contentText}</p>

                <div className="flex justify-between items-center text-gray-500">
                    <div className="flex gap-4">
                        <Button variant="ghost" size="icon">
                            <Heart className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon">
                            <MessageCircle className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon">
                            <Share2 className="h-5 w-5" />
                        </Button>
                    </div>
                    <Button variant="ghost" size="icon">
                        <Bookmark className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </Card>
    );
}
