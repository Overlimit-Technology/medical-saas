import { Suspense } from "react";
import MyProfile from "@/presentation/profile/MyProfile";

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <MyProfile />
    </Suspense>
  );
}
