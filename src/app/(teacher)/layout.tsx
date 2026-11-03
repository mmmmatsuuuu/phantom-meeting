import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/server";
import NavBar from "@/components/shared/nav-bar";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "teacher" && profile.role !== "admin") {
    redirect("/");
  }

  return (
    <>
      <NavBar />
      {children}
    </>
  );
}
