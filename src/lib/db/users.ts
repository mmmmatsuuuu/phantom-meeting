import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * role='student' かつ is_approved=true（教師申請済み）のプロフィール一覧を取得する
 */
export async function getPendingTeachers(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "student")
    .eq("is_approved", true)
    .order("created_at");

  if (error || !data) return [];
  return data;
}

/**
 * 全ユーザーのプロフィール一覧を取得する（teacher/admin 用）
 */
export async function getAllProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("student_number", { ascending: true, nullsFirst: false });

  if (error || !data) return [];
  return data;
}

/**
 * ユーザーを teacher として承認する（role='teacher' に昇格）
 */
export async function approveUser(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: "teacher" })
    .eq("id", userId);
  return !error;
}
