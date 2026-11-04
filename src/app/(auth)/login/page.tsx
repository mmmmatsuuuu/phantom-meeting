import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LoginButton from "@/components/shared/login-button";
import DevLoginPanel from "@/components/shared/dev-login-panel";
import Mascot from "@/components/shared/mascot";
import { isDevLoginEnabled } from "@/lib/dev-login";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // すでにログイン済みなら / にリダイレクト
  const user = await getUser();
  if (user) redirect("/");

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <Mascot pose="login" size={200} className="mx-auto -mb-2" />
        <h1 className="font-hand font-semibold text-[34px] tracking-wide">ruminy</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          飲み込んで終わりにしない。反芻する学習サイト
        </p>

        {error === "auth_failed" && (
          <p className="mb-3 text-sm text-destructive">
            ログインに失敗しました。もう一度お試しください。
          </p>
        )}

        <LoginButton />
        <p className="mt-3 text-xs text-muted-foreground">学校の Google アカウントを使います</p>

        {isDevLoginEnabled() && (
          <div className="mt-10 text-left">
            <DevLoginPanel hasError={error === "dev_login_failed"} />
          </div>
        )}
      </div>
    </div>
  );
}
