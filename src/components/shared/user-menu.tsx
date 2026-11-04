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

const ROLE_LABELS: Record<Props["role"], string> = {
  student: "生徒",
  teacher: "教師",
  admin: "管理者",
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
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-surface transition-colors outline-none">
        <span className="max-w-[160px] truncate text-foreground">{displayName}</span>
        <span className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</span>
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
          <Link href="/">レッスン一覧</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/memos">ノート一覧</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/quiz-results">小テスト結果</Link>
        </DropdownMenuItem>
        {(role === "teacher" || role === "admin") && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/teacher">教師ページ</Link>
            </DropdownMenuItem>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              授業をつくる
            </DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href="/teacher/contents">コンテンツ管理</Link>
            </DropdownMenuItem>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              生徒をみる
            </DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href="/teacher/analytics">分析</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/teacher/students">生徒一覧</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/teacher/data-export">データエクスポート</Link>
            </DropdownMenuItem>
          </>
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
