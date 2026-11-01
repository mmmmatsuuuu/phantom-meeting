import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEV_LOGIN_PASSWORD, isDevAccountEmail, isDevLoginEnabled } from "@/lib/dev-login";

function redirectTo(location: string) {
  return new NextResponse(null, { status: 303, headers: { Location: location } });
}

/** 開発環境専用。本番では 404 を返し、ルートが存在しないものとして扱う */
export async function POST(req: NextRequest) {
  if (!isDevLoginEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const formData = await req.formData();
  const email = formData.get("email");
  if (typeof email !== "string" || !isDevAccountEmail(email)) {
    return redirectTo("/login?error=dev_login_failed");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: DEV_LOGIN_PASSWORD,
  });
  return redirectTo(error ? "/login?error=dev_login_failed" : "/");
}
