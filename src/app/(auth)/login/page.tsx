import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LoginButton from "@/components/shared/login-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // すでにログイン済みなら / にリダイレクト
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-slate-900 dark:to-indigo-950">
      <div className="w-full max-w-sm space-y-8 px-4">
        {/* Logo + title */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 shadow-lg">
            <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8 ml-1">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">
              情報Ⅰ 授業プラットフォーム
            </h1>
            <p className="text-base text-muted-foreground font-medium">
              動画で学び、思考を深める
            </p>
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">1</span>
            授業動画をいつでも視聴
          </li>
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">2</span>
            タイムスタンプ付きメモで理解を記録
          </li>
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">3</span>
            小テストで学習定着を確認
          </li>
        </ul>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-md border p-6 space-y-4">
          <p className="text-sm text-center text-muted-foreground">
            学校のGoogleアカウントでログイン
          </p>

          {error === "auth_failed" && (
            <p className="text-sm text-center text-destructive">
              ログインに失敗しました。もう一度お試しください。
            </p>
          )}

          <LoginButton />
        </div>
      </div>
    </div>
  );
}
