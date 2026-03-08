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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">情報Ⅰ 授業プラットフォーム</h1>
          <p className="text-sm text-muted-foreground">
            学校のGoogleアカウントでログインしてください
          </p>
        </div>

        {error === "auth_failed" && (
          <p className="text-sm text-center text-destructive">
            ログインに失敗しました。もう一度お試しください。
          </p>
        )}

        <LoginButton />
      </div>
    </div>
  );
}
