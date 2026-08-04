import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

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
 * 指定レッスンのコードプレイグラウンド利用状況を生徒×スニペットのマトリクスで取得する
 * （teacher/admin 向け）。getLessonQuizResultsByStudent と同じ学年・クラス絞り込み方式。
 */
export async function getLessonCodeStatesByStudent(
  lessonId: string,
  grade: number,
  classNum: number | "all"
): Promise<LessonCodeResults | null> {
  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, title, code_snippets(id, title, language, order)")
    .eq("id", lessonId)
    .single();
  if (!lesson) return null;

  const snippets: LessonCodeSnippetMeta[] = [...lesson.code_snippets]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ id: s.id, title: s.title, language: s.language, order: s.order }));

  let profilesQuery = supabase
    .from("profiles")
    .select("id, display_name, student_number")
    .eq("role", "student")
    .not("student_number", "is", null);

  if (classNum === "all") {
    profilesQuery = profilesQuery
      .gte("student_number", grade * 1000)
      .lte("student_number", grade * 1000 + 999);
  } else {
    const min = grade * 1000 + classNum * 100;
    profilesQuery = profilesQuery
      .gte("student_number", min)
      .lte("student_number", min + 99);
  }

  const { data: profiles } = await profilesQuery
    .order("student_number", { ascending: true })
    .limit(2000);
  const studentProfiles = profiles ?? [];

  const result: LessonCodeResults = {
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    snippets,
    students: studentProfiles.map((p) => ({
      userId: p.id,
      displayName: p.display_name,
      studentNumber: p.student_number,
      states: {},
    })),
  };

  if (studentProfiles.length === 0 || snippets.length === 0) return result;

  const studentIds = studentProfiles.map((p) => p.id);
  const snippetIds = snippets.map((s) => s.id);
  const rowByUser = new Map(result.students.map((s) => [s.userId, s]));

  const { data: states } = await supabase
    .from("code_states")
    .select("snippet_id, user_id, code, last_output, updated_at")
    .in("user_id", studentIds)
    .in("snippet_id", snippetIds);

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
