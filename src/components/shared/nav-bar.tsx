import Link from "next/link";
import { getUserProfile } from "@/lib/supabase/server";
import UserMenu from "@/components/shared/user-menu";

export default async function NavBar() {
  const profile = await getUserProfile();

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
          {profile && (
            <UserMenu displayName={profile.displayName} role={profile.role} />
          )}
        </nav>
      </div>
    </header>
  );
}
