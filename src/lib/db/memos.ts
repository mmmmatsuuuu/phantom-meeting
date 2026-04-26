import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type Memo = Database["public"]["Tables"]["memos"]["Row"] & {
  content: TiptapContent;
};

export type TiptapText = {
  type: "text";
  text: string;
};

export type TiptapParagraph = {
  type: "paragraph";
  content?: TiptapText[];
};

export type TiptapContent = {
  type: "doc";
  content: TiptapParagraph[];
};

/**
 * ログインユーザーの指定レッスンのメモ一覧を取得する
 */
export async function getMemosByLessonId(lessonId: string): Promise<Memo[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("memos")
    .select("*")
    .eq("lesson_id", lessonId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as Memo[];
}

/**
 * メモを新規作成する
 */
export async function createMemo(params: {
  lessonId: string;
  content: TiptapContent;
  timestampSeconds: number | null;
}): Promise<Memo | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("memos")
    .insert({
      lesson_id: params.lessonId,
      user_id: user.id,
      content: params.content,
      timestamp_seconds: params.timestampSeconds,
    })
    .select()
    .single();

  if (error || !data) return null;
  return data as Memo;
}

/**
 * ログインユーザーの全レッスンのメモ一覧を取得する
 */
export async function getAllMemos(): Promise<Memo[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("memos")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as Memo[];
}

export type StudentWithMemoCount = {
  id: string;
  display_name: string;
  student_number: number | null;
  memo_count: number;
};

/**
 * 指定学年・クラスの生徒一覧とメモ件数を取得する（teacher/admin 向け）
 * student_number の桁構造: 1桁目=学年, 2桁目=クラス, 3〜4桁目=出席番号
 */
export async function getStudentsWithMemoCounts(
  lessonId: string,
  grade: number,
  classNum: number
): Promise<StudentWithMemoCount[]> {
  const supabase = await createClient();
  const min = grade * 1000 + classNum * 100;
  const max = min + 99;

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name, student_number")
    .eq("role", "student")
    .gte("student_number", min)
    .lte("student_number", max)
    .order("student_number", { ascending: true, nullsFirst: false });

  if (profilesError || !profiles) return [];
  if (profiles.length === 0) return [];

  const { data: memos } = await supabase
    .from("memos")
    .select("user_id")
    .eq("lesson_id", lessonId)
    .in(
      "user_id",
      profiles.map((p) => p.id)
    );

  const memoCounts = new Map<string, number>();
  for (const memo of memos ?? []) {
    memoCounts.set(memo.user_id, (memoCounts.get(memo.user_id) ?? 0) + 1);
  }

  return profiles.map((p) => ({
    ...p,
    memo_count: memoCounts.get(p.id) ?? 0,
  }));
}

/**
 * 特定生徒の指定レッスンのメモ一覧を取得する（teacher/admin 向け）
 */
export async function getMemosByStudent(
  lessonId: string,
  userId: string
): Promise<Memo[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("memos")
    .select("*")
    .eq("lesson_id", lessonId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as Memo[];
}

/**
 * メモを削除する
 */
export async function deleteMemo(memoId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase.from("memos").delete().eq("id", memoId);

  return !error;
}
