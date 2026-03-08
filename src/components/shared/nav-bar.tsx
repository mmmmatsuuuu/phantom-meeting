import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/shared/logout-button";

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
        <nav className="flex items-center gap-4 text-sm">
          {user && (
            <>
              <Link
                href="/"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                📺 レッスン一覧
              </Link>
              <Link
                href="/teacher/lessons/new"
                className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                + レッスンを登録
              </Link>
              <span className="text-muted-foreground text-xs border-l pl-4">
                {displayName}
              </span>
              <LogoutButton />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
