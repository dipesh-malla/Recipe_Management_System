import MainLayout from "@/components/MainLayout";
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@/lib/api';

// Redirect /profile to the dynamic profile route for the current user
export default function MyProfile() {
    const navigate = useNavigate();

    useEffect(() => {
        const user = getCurrentUser();
        if (!user) {
            navigate('/login');
            return;
        }
        // Navigate to /profile/:userId so the profile page is bookmarkable and consistent
        navigate(`/profile/${user.id}`, { replace: true });
    }, [navigate]);

    return (
        <MainLayout>
            {/* Redirecting to dynamic profile... */}
            <div />
        </MainLayout>
    );
}
