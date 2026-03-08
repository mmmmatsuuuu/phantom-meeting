import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    // リダイレクトレスポンスを先に作成し、cookieをそこにセットする
    const response = NextResponse.redirect(`${origin}${next}`);

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
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
