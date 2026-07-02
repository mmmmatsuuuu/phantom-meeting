import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Database } from "@/lib/supabase/types";

export async function createClient() {
  const cookieStore = await cookies();
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const internalUrl = process.env.SUPABASE_INTERNAL_URL;

  return createServerClient(
    publicUrl,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: internalUrl
        ? {
            fetch: (input, init) => {
              const url =
                typeof input === "string"
                  ? input.replace(publicUrl, internalUrl)
                  : input;
              return fetch(url, init);
            },
          }
        : undefined,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Componentからの呼び出し時はcookieのsetは無視される
          }
        },
      },
    }
  );
}

/**
 * ログインユーザーの ID・メールアドレスを取得する（Auth サーバーへの通信なし）。
 *
 * JWT の署名検証はミドルウェア（proxy.ts → updateSession）が全リクエストで
 * getClaims() により実施済みのため、ここでは Cookie のセッションを信頼して読み取る。
 * React cache により同一リクエスト内では1回だけ実行される。
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;
  return { id: user.id, email: user.email };
});

export type Role = Database["public"]["Enums"]["role"];

export type UserProfile = {
  userId: string;
  displayName: string;
  role: Role;
};

/**
 * ログインユーザーのプロフィール（表示名・ロール）を取得する。
 * React cache により同一リクエスト内では認証確認・profiles クエリとも1回だけ実行される。
 */
export const getUserProfile = cache(async (): Promise<UserProfile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .single();

  return {
    userId: user.id,
    displayName: profile?.display_name ?? user.email ?? "",
    role: profile?.role ?? "student",
  };
});
