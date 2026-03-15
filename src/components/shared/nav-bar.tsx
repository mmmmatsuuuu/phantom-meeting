import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import UserMenu from "@/components/shared/user-menu";

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = "";
  let role: "admin" | "teacher" | "student" = "student";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, role")
      .eq("id", user.id)
      .single();
    displayName = profile?.display_name ?? user.email ?? "";
    role = profile?.role ?? "student";
  }

  return (
    <header className="border-b bg-card sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600">
            <svg
              viewBox="0 0 24 24"
              fill="white"
              className="w-3.5 h-3.5 ml-0.5"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className="font-bold text-lg text-foreground">
            情報Ⅰ 授業プラットフォーム
          </span>
        </Link>
        <nav className="flex items-center text-sm">
          {user && <UserMenu displayName={displayName} role={role} />}
        </nav>
      </div>
    </header>
  );
}
