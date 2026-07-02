import { NextResponse } from "next/server";
import { getUser, getUserProfile } from "@/lib/supabase/server";

export type AuthedUser = {
  id: string;
};

export type AuthResult =
  | { user: AuthedUser; errorResponse: null }
  | { user: null; errorResponse: NextResponse };

/**
 * ログイン済みユーザーを要求する（API Route 用）。
 * 未ログインなら 401 レスポンスを返す。
 */
export async function requireUser(): Promise<AuthResult> {
  const user = await getUser();
  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { data: null, error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }
  return { user: { id: user.id }, errorResponse: null };
}

/**
 * teacher / admin ロールを要求する（API Route 用）。
 * 未ログインなら 401、権限不足なら 403 レスポンスを返す。
 */
export async function requireTeacher(): Promise<AuthResult> {
  const profile = await getUserProfile();
  if (!profile) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { data: null, error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }
  if (profile.role !== "teacher" && profile.role !== "admin") {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { data: null, error: "Forbidden" },
        { status: 403 }
      ),
    };
  }
  return { user: { id: profile.userId }, errorResponse: null };
}
