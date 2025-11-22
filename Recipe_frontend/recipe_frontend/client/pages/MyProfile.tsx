import MainLayout from "@/components/MainLayout";
// Update the import path to the correct relative location if necessary
import UserProfile from "../components/UserProfile";

export default function MyProfile() {
    return (
        <MainLayout>
            <UserProfile />
        </MainLayout>
    );
}
