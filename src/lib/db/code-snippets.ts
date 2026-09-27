import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { studentNumberRange } from "@/lib/student-number";

export type CodeSnippet = Database["public"]["Tables"]["code_snippets"]["Row"];
export type CodeLanguage = Database["public"]["Enums"]["code_language"];

export type CreateCodeSnippetInput = {
  title: string;
  language: CodeLanguage;
  initialCode: string;
};

/**
 * レッスンに紐づく初期コード一覧を order 順で取得する
 */
export async function getCodeSnippetsByLesson(
  lessonId: string
): Promise<CodeSnippet[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("code_snippets")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("order");

  if (error || !data) return [];
  return data;
}

/**
 * 初期コードを1件追加する（teacher/admin のみ）
 */
export async function addCodeSnippet(
  lessonId: string,
  input: CreateCodeSnippetInput
): Promise<CodeSnippet | null> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("code_snippets")
    .select("*", { count: "exact", head: true })
    .eq("lesson_id", lessonId);

  const { data, error } = await supabase
    .from("code_snippets")
    .insert({
      lesson_id: lessonId,
      title: input.title,
      language: input.language,
      initial_code: input.initialCode,
      order: count ?? 0,
    })
    .select()
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * 初期コードを更新する（teacher/admin のみ）
 */
export async function updateCodeSnippet(
  snippetId: string,
  input: Partial<CreateCodeSnippetInput>
): Promise<boolean> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.language !== undefined) patch.language = input.language;
  if (input.initialCode !== undefined) patch.initial_code = input.initialCode;

  const { error } = await supabase
    .from("code_snippets")
    .update(patch)
    .eq("id", snippetId);
  return !error;
}

/**
 * 初期コードの表示順を1つ上下に入れ替える（teacher/admin のみ）
 */
export async function moveCodeSnippet(
  lessonId: string,
  snippetId: string,
  direction: "up" | "down"
): Promise<boolean> {
  const supabase = await createClient();
  const { data: snippets, error } = await supabase
    .from("code_snippets")
    .select("id, order")
    .eq("lesson_id", lessonId)
    .order("order");

  if (error || !snippets) return false;

  const index = snippets.findIndex((s) => s.id === snippetId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || targetIndex < 0 || targetIndex >= snippets.length) return false;

  const current = snippets[index];
  const target = snippets[targetIndex];

  const [resA, resB] = await Promise.all([
    supabase.from("code_snippets").update({ order: target.order }).eq("id", current.id),
    supabase.from("code_snippets").update({ order: current.order }).eq("id", target.id),
  ]);
  return !resA.error && !resB.error;
}

/**
 * 初期コードを削除する（teacher/admin のみ）
 */
export async function deleteCodeSnippet(snippetId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("code_snippets").delete().eq("id", snippetId);
  return !error;
}

/**
 * レッスンのプレイグラウンド有効/無効を切り替える（teacher/admin のみ）
 */
export async function setLessonPlaygroundEnabled(
  lessonId: string,
  enabled: boolean
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("lessons")
    .update({ enable_playground: enabled })
    .eq("id", lessonId);
  return !error;
}

// ─── 生徒の編集内容の保存 ────────────────────────────────────────────

export type StudentCodeState = Database["public"]["Tables"]["code_states"]["Row"];

export type StudentCodeStateEntry = {
  code: string;
  lastOutput: string | null;
};

/**
 * ログインユーザーの、指定レッスンの全スニペットの保存済みコード・直近の実行結果を取得する
 */
export async function getStudentCodeStatesByLesson(
  lessonId: string,
  userId: string
): Promise<Record<string, StudentCodeStateEntry>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("code_states")
    .select("snippet_id, code, last_output, code_snippets!inner(lesson_id)")
    .eq("user_id", userId)
    .eq("code_snippets.lesson_id", lessonId);

  if (error || !data) return {};
  return Object.fromEntries(
    data.map((row) => [row.snippet_id, { code: row.code, lastOutput: row.last_output }])
  );
}

// ─── レッスン別分析（教員向け・生徒×コードスニペット） ──────────────────

export type LessonCodeSnippetMeta = {
  id: string;
  title: string;
  language: CodeLanguage;
  order: number;
};

export type LessonCodeStudentState = {
  code: string;
  lastOutput: string | null;
  updatedAt: string;
};

export type LessonCodeStudentRow = {
  userId: string;
  displayName: string;
  studentNumber: number | null;
  /** snippetId → 保存済みの編集内容。未編集の場合はキーなし */
  states: Record<string, LessonCodeStudentState>;
};

export type LessonCodeResults = {
  lessonId: string;
  lessonTitle: string;
  snippets: LessonCodeSnippetMeta[];
  students: LessonCodeStudentRow[];
};

/**
 * 指定レッスン・クラスのコードプレイグラウンド利用状況を生徒×スニペットのマトリクスで取得する
 * （teacher/admin 向け）。レッスンが存在しない場合のみ null。
 *
 * 1クラス（最大99人）に限定しているため、保存内容は「生徒数×スニペット数」行で max_rows（1000行）に収まる。
 */
export async function getLessonCodeStatesByStudent(
  lessonId: string,
  grade: number,
  classNum: number
): Promise<LessonCodeResults | null> {
  const supabase = await createClient();
  const { min, max } = studentNumberRange(grade, classNum);

  // 3クエリを並列で取得する。保存内容はスニペットのレッスンと生徒の学籍番号で絞り込む
  const [{ data: lesson }, { data: profiles }, { data: states }] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, title, code_snippets(id, title, language, order)")
      .eq("id", lessonId)
      .single(),
    supabase
      .from("profiles")
      .select("id, display_name, student_number")
      .eq("role", "student")
      .gte("student_number", min)
      .lte("student_number", max)
      .order("student_number", { ascending: true }),
    supabase
      .from("code_states")
      .select("snippet_id, user_id, code, last_output, updated_at, code_snippets!inner(), profiles!inner()")
      .eq("code_snippets.lesson_id", lessonId)
      .gte("profiles.student_number", min)
      .lte("profiles.student_number", max),
  ]);
  if (!lesson) return null;

  const snippets: LessonCodeSnippetMeta[] = [...lesson.code_snippets]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ id: s.id, title: s.title, language: s.language, order: s.order }));

  const result: LessonCodeResults = {
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    snippets,
    students: (profiles ?? []).map((p) => ({
      userId: p.id,
      displayName: p.display_name,
      studentNumber: p.student_number,
      states: {},
    })),
  };

  const rowByUser = new Map(result.students.map((s) => [s.userId, s]));

  for (const state of states ?? []) {
    const row = rowByUser.get(state.user_id);
    if (!row) continue;
    row.states[state.snippet_id] = {
      code: state.code,
      lastOutput: state.last_output,
      updatedAt: state.updated_at,
    };
  }

  return result;
}

/**
 * 生徒の編集内容・直近の実行結果を保存する（本人のみ）。存在すれば更新、なければ新規作成
 */
export async function saveStudentCodeState(
  snippetId: string,
  userId: string,
  code: string,
  lastOutput: string | null
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("code_states")
    .upsert(
      {
        snippet_id: snippetId,
        user_id: userId,
        code,
        last_output: lastOutput,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "snippet_id,user_id" }
    );
  return !error;
}
