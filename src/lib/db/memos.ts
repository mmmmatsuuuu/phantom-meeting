import { createClient, getUser } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { tiptapDocToText } from "@/lib/tiptap-utils";
import { studentNumberRange } from "@/lib/student-number";

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

export type LessonMemoStudent = {
  id: string;
  display_name: string;
  student_number: number | null;
  /** このレッスンのメモ（作成日時の昇順） */
  memos: Memo[];
};

/**
 * 指定レッスン・クラスの生徒一覧と、各生徒のメモを取得する（teacher/admin 向け）
 *
 * 生徒一覧とクラス全員分のメモを並列で1回ずつ取得し、生徒ごとに振り分ける。
 * 1クラス（最大99人）×1レッスンに限定しているため、メモは max_rows（1000行）に収まる。
 */
export async function getLessonMemosByClass(
  lessonId: string,
  grade: number,
  classNum: number
): Promise<LessonMemoStudent[]> {
  const supabase = await createClient();
  const { min, max } = studentNumberRange(grade, classNum);

  const [{ data: profiles }, { data: memos }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, student_number")
      .eq("role", "student")
      .gte("student_number", min)
      .lte("student_number", max)
      .order("student_number", { ascending: true }),
    supabase
      .from("memos")
      .select("id, user_id, lesson_id, content, timestamp_seconds, created_at, updated_at, profiles!inner()")
      .eq("lesson_id", lessonId)
      .gte("profiles.student_number", min)
      .lte("profiles.student_number", max)
      .order("created_at", { ascending: true }),
  ]);

  const memosByUser = new Map<string, Memo[]>();
  for (const memo of (memos ?? []) as Memo[]) {
    const list = memosByUser.get(memo.user_id) ?? [];
    list.push(memo);
    memosByUser.set(memo.user_id, list);
  }

  return (profiles ?? []).map((p) => ({
    ...p,
    memos: memosByUser.get(p.id) ?? [],
  }));
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

  // 単元とレッスンをネスト select で1クエリで取得
  const { data: unit } = await supabase
    .from("units")
    .select("name, lessons(id, title, order)")
    .eq("id", unitId)
    .single();
  if (!unit) return null;

  const lessons = [...unit.lessons].sort((a, b) => a.order - b.order);
  if (lessons.length === 0) return null;

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
 * 指定ユーザーのレッスンごとのメモ件数を1クエリで取得する
 */
export async function getMemoCountsByLesson(
  userId: string
): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memos")
    .select("lesson_id")
    .eq("user_id", userId)
    .limit(5000);

  const counts: Record<string, number> = {};
  for (const memo of data ?? []) {
    counts[memo.lesson_id] = (counts[memo.lesson_id] ?? 0) + 1;
  }
  return counts;
}

/**
 * メモを削除する
 */
export async function deleteMemo(memoId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase.from("memos").delete().eq("id", memoId);

  return !error;
}
