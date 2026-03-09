import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * role='teacher' かつ is_approved=false のプロフィール一覧を取得する
 */
export async function getPendingTeachers(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "teacher")
    .eq("is_approved", false)
    .order("created_at");

  if (error || !data) return [];
  return data;
}

/**
 * ユーザーを teacher として承認する（is_approved=true に更新）
 */
export async function approveUser(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_approved: true })
    .eq("id", userId);
  return !error;
}
