import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/server";
import NavBar from "@/components/shared/nav-bar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "admin") {
    redirect("/");
  }

  return (
    <>
      <NavBar />
      {children}
    </>
  );
}
