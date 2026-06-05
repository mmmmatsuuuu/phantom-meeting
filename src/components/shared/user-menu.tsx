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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

function RoleIcon({ role }: { role: Props["role"] }) {
  if (role === "student") {
    // 卒業帽（graduation cap）
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-3.5 h-3.5 text-sky-500"
        aria-hidden="true"
      >
        <path d="M12 3L1 9l11 6 11-6-11-6z" />
        <path d="M5 13.18V17l7 3.82L19 17v-3.82L12 17l-7-3.82z" />
      </svg>
    );
  }
  if (role === "teacher") {
    // 黒板・プレゼン画面
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-3.5 h-3.5 text-emerald-500"
        aria-hidden="true"
      >
        <path d="M20 3H4C2.9 3 2 3.9 2 5v11c0 1.1.9 2 2 2h7v2H8v2h8v-2h-3v-2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 13H4V5h16v11z" />
      </svg>
    );
  }
  // admin — シールド（shield）
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-3.5 h-3.5 text-violet-500"
      aria-hidden="true"
    >
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
    </svg>
  );
}

export default function UserMenu({ displayName, role }: Props) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <TooltipProvider>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 text-sm hover:bg-muted transition-colors outline-none border">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold shrink-0">
            {displayName.charAt(0) || "?"}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="max-w-[120px] truncate text-foreground">{displayName}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center shrink-0">
                  <RoleIcon role={role} />
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">{ROLE_LABELS[role]}</TooltipContent>
            </Tooltip>
          </div>
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
          <DropdownMenuItem asChild>
            <Link href="/memos">📝 メモ一覧</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/quiz-results">📊 小テスト結果</Link>
          </DropdownMenuItem>
          {(role === "teacher" || role === "admin") && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                教師メニュー
              </DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/teacher/contents">📚 コンテンツ管理</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/teacher/lessons/new">+ レッスンを登録</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/teacher/students">👥 生徒一覧</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/teacher/quiz-analytics">📈 小テスト分析</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/teacher/data-export">📤 データエクスポート</Link>
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
    </TooltipProvider>
  );
}
