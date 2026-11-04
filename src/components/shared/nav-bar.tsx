import Link from "next/link";
import { getUserProfile } from "@/lib/supabase/server";
import UserMenu from "@/components/shared/user-menu";
import SiteLogo from "@/components/shared/site-logo";

export default async function NavBar() {
  const profile = await getUserProfile();

  return (
    <header className="sticky top-0 z-10 bg-background">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between border-b-2 border-ink">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <SiteLogo />
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
