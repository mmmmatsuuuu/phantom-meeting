import { createClient, getUser } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { tiptapDocToText } from "@/lib/tiptap-utils";

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
  const user = await getUser();
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
  const user = await getUser();
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
  const user = await getUser();
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
 * grade / classNum はどちらか一方のみ、または両方を指定できる
 */
export async function getStudentsWithMemoCounts(
  lessonId: string,
  grade: number | null,
  classNum: number | null
): Promise<StudentWithMemoCount[]> {
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("id, display_name, student_number")
    .eq("role", "student")
    .not("student_number", "is", null);

  if (grade !== null && classNum !== null) {
    const min = grade * 1000 + classNum * 100;
    query = query.gte("student_number", min).lte("student_number", min + 99);
  } else if (grade !== null) {
    query = query.gte("student_number", grade * 1000).lte("student_number", grade * 1000 + 999);
  }
  // classNum のみの場合は全件取得して JS でフィルタ

  const { data: rawProfiles, error: profilesError } = await query.order("student_number", {
    ascending: true,
    nullsFirst: false,
  });

  if (profilesError || !rawProfiles) return [];

  const profiles =
    grade === null && classNum !== null
      ? rawProfiles.filter(
          (p) =>
            p.student_number !== null &&
            Math.floor((p.student_number % 1000) / 100) === classNum
        )
      : rawProfiles;

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

export type LessonMemoSample = {
  lessonTitle: string;
  memos: string[];
};

export type UnitMemoExportData = {
  unitName: string;
  grade: number;
  studentCount: number;
  exportDate: string;
  lessons: LessonMemoSample[];
};

/**
 * 単元内の各レッスンで対象学年の生徒が書いたメモをサンプリングして返す（teacher/admin 向け）
 * - レッスンごとにメモを1件以上書いた生徒からランダムに最大10人を抽出
 * - 同一生徒の複数メモは「／」で結合し300文字で切り詰め
 * - 学籍番号・氏名は含めない
 */
export async function getUnitMemoSamplesForExport(
  unitId: string,
  grade: number
): Promise<UnitMemoExportData | null> {
  const supabase = await createClient();

  const { data: unit } = await supabase
    .from("units")
    .select("name")
    .eq("id", unitId)
    .single();
  if (!unit) return null;

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title, order")
    .eq("unit_id", unitId)
    .order("order");
  if (!lessons || lessons.length === 0) return null;

  const lessonIds = lessons.map((l) => l.id);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, student_number")
    .eq("role", "student")
    .not("student_number", "is", null)
    .gte("student_number", grade * 1000)
    .lte("student_number", grade * 1000 + 999)
    .limit(2000);

  const students = profiles ?? [];
  const studentIds = students.map((p) => p.id);

  const exportDate = new Date().toISOString().slice(0, 10);

  if (studentIds.length === 0) {
    return { unitName: unit.name, grade, studentCount: 0, exportDate, lessons: [] };
  }

  type MemoRow = {
    lesson_id: string;
    user_id: string;
    content: unknown;
    created_at: string;
  };

  const allMemos: MemoRow[] = [];
  const CHUNK_SIZE = 100;
  for (let i = 0; i < studentIds.length; i += CHUNK_SIZE) {
    const chunk = studentIds.slice(i, i + CHUNK_SIZE);
    const { data: chunkMemos } = await supabase
      .from("memos")
      .select("lesson_id, user_id, content, created_at")
      .in("lesson_id", lessonIds)
      .in("user_id", chunk)
      .order("created_at", { ascending: true });
    if (chunkMemos) allMemos.push(...(chunkMemos as MemoRow[]));
  }

  // レッスン × ユーザーごとにメモをグループ化
  const memosByLessonUser = new Map<string, Map<string, MemoRow[]>>();
  for (const memo of allMemos) {
    if (!memosByLessonUser.has(memo.lesson_id)) {
      memosByLessonUser.set(memo.lesson_id, new Map());
    }
    const byUser = memosByLessonUser.get(memo.lesson_id)!;
    const existing = byUser.get(memo.user_id) ?? [];
    existing.push(memo);
    byUser.set(memo.user_id, existing);
  }

  const MAX_SAMPLES = 10;
  const MAX_CHARS = 300;

  const lessonSamples: LessonMemoSample[] = [];

  for (const lesson of lessons) {
    const byUser = memosByLessonUser.get(lesson.id);
    if (!byUser || byUser.size === 0) continue;

    const usersWithMemos = Array.from(byUser.keys());
    // Fisher–Yates シャッフル
    for (let i = usersWithMemos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [usersWithMemos[i], usersWithMemos[j]] = [usersWithMemos[j], usersWithMemos[i]];
    }
    const sampled = usersWithMemos.slice(0, MAX_SAMPLES);

    const memoTexts: string[] = [];
    for (const userId of sampled) {
      const userMemos = byUser.get(userId) ?? [];
      const texts = userMemos
        .map((m) => tiptapDocToText(m.content as Record<string, unknown>).trim())
        .filter((t) => t.length > 0);
      if (texts.length === 0) continue;
      const merged = texts.join("／");
      const truncated = merged.length > MAX_CHARS ? merged.slice(0, MAX_CHARS) + "…" : merged;
      memoTexts.push(truncated);
    }

    if (memoTexts.length === 0) continue;
    lessonSamples.push({ lessonTitle: lesson.title, memos: memoTexts });
  }

  return { unitName: unit.name, grade, studentCount: students.length, exportDate, lessons: lessonSamples };
}

/**
 * メモを削除する
 */
export async function deleteMemo(memoId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase.from("memos").delete().eq("id", memoId);

  return !error;
}
