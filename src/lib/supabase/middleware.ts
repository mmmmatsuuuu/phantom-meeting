import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const internalUrl = process.env.SUPABASE_INTERNAL_URL;

  const supabase = createServerClient(
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
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // セッションを更新し JWT を検証する。
  // JWT Signing Keys（非対称鍵）移行後は Auth サーバーへの通信なしでローカル検証される。
  // 移行前は自動的に従来どおりサーバー問い合わせで検証される。
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  // 未認証ユーザーを /login にリダイレクト（認証不要パスを除く）
  const pathname = request.nextUrl.pathname;
  const isPublicPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
