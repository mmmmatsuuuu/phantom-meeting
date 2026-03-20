"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";

type Props = {
  displayName: string;
  role: "admin" | "teacher" | "student";
};

export default function UserMenu({ displayName, role }: Props) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 text-sm hover:bg-muted transition-colors outline-none border">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold shrink-0">
          {displayName.charAt(0) || "?"}
        </span>
        <span className="max-w-[120px] truncate text-foreground">{displayName}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal truncate">
          {displayName}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/">📺 レッスン一覧</Link>
        </DropdownMenuItem>
        {role === "student" && (
          <DropdownMenuItem asChild>
            <Link href="/memos">📝 メモ一覧</Link>
          </DropdownMenuItem>
        )}
        {(role === "teacher" || role === "admin") && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/teacher/contents">📚 コンテンツ管理</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/teacher/lessons/new">+ レッスンを登録</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/teacher/students">👥 生徒一覧</Link>
            </DropdownMenuItem>
          </>
        )}
        {role === "admin" && (
          <DropdownMenuItem asChild>
            <Link href="/admin/users">👤 ユーザー管理</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">プロフィール編集</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive focus:text-destructive"
        >
          ログアウト
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
