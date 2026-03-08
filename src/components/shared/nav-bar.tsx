import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import UserMenu from "@/components/shared/user-menu";

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = "";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();
    displayName = profile?.display_name ?? user.email ?? "";
  }

  return (
    <header className="border-b bg-card sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="font-bold text-lg text-foreground hover:opacity-80 transition-opacity"
        >
          情報Ⅰ 授業プラットフォーム
        </Link>
        <nav className="flex items-center text-sm">
          {user && <UserMenu displayName={displayName} />}
        </nav>
      </div>
    </header>
  );
}
