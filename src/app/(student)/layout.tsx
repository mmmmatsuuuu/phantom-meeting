import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import NavBar from "@/components/shared/nav-bar";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <NavBar />
      {children}
    </>
  );
}
