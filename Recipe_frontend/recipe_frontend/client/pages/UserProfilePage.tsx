import { useParams } from 'react-router-dom';
import MainLayout from "@/components/MainLayout";
import PublicUserProfile from "../components/PublicUserProfile";

export default function UserProfilePage() {
    const { userId } = useParams<{ userId: string }>();
    
    return (
        <MainLayout>
            <PublicUserProfile userId={userId ? parseInt(userId) : undefined} />
        </MainLayout>
    );
}
