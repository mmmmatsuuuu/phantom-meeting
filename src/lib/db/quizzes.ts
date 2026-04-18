import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type Quiz = Database["public"]["Tables"]["quizzes"]["Row"];
export type QuizQuestion = Database["public"]["Tables"]["quiz_questions"]["Row"];
export type QuizQuestionType = Database["public"]["Enums"]["quiz_question_type"];

export type QuizWithQuestions = Quiz & { questions: QuizQuestion[] };

export type CreateQuizQuestionInput = {
  type: QuizQuestionType;
  content: Record<string, unknown>; // tiptap JSON（問題文）
  explanation: Record<string, unknown> | null; // tiptap JSON（解説）
  options: string[] | null;
  correctAnswer:
    | { index: number }  // multiple_choice
    | { text: string }   // short_answer
    | string[];          // ordering（正解順）
  order: number;
};

type InsertRow = Database["public"]["Tables"]["quiz_questions"]["Insert"];

export type QuizAttemptInput = {
  quizId: string;
  userId: string;
  score: number;
  maxScore: number;
};

/**
 * レッスンに紐づくクイズと問題一覧を取得する
 */
export async function getQuizWithQuestions(
  lessonId: string
): Promise<QuizWithQuestions | null> {
  const supabase = await createClient();

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("*")
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (quizError || !quiz) return null;

  const { data: questions, error: questionsError } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quiz.id)
    .order("order");

  if (questionsError) return null;

  return { ...quiz, questions: questions ?? [] };
}

/**
 * クイズと問題を一括作成する（teacher/admin のみ）
 */
export async function createQuiz(params: {
  lessonId: string;
  title: string;
  questions: CreateQuizQuestionInput[];
}): Promise<Quiz | null> {
  const supabase = await createClient();

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .insert({ lesson_id: params.lessonId, title: params.title })
    .select()
    .single();

  if (quizError || !quiz) return null;

  if (params.questions.length > 0) {
    const rows = params.questions.map((q) => ({
      quiz_id: quiz.id,
      type: q.type,
      content: q.content as InsertRow["content"],
      explanation: q.explanation as InsertRow["explanation"],
      options: q.options as InsertRow["options"],
      correct_answer: q.correctAnswer as InsertRow["correct_answer"],
      order: q.order,
    }));

    const { error: questionsError } = await supabase
      .from("quiz_questions")
      .insert(rows);

    if (questionsError) return null;
  }

  return quiz;
}

/**
 * 既存クイズに問題を1件追加する（teacher/admin のみ）
 */
export async function addQuizQuestion(
  quizId: string,
  input: Omit<CreateQuizQuestionInput, "order">
): Promise<QuizQuestion | null> {
  const supabase = await createClient();

  // 現在の問題数を order として使用
  const { count } = await supabase
    .from("quiz_questions")
    .select("*", { count: "exact", head: true })
    .eq("quiz_id", quizId);

  const row = {
    quiz_id: quizId,
    type: input.type,
    content: input.content as InsertRow["content"],
    explanation: input.explanation as InsertRow["explanation"],
    options: input.options as InsertRow["options"],
    correct_answer: input.correctAnswer as InsertRow["correct_answer"],
    order: count ?? 0,
  };

  const { data, error } = await supabase
    .from("quiz_questions")
    .insert(row)
    .select()
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * 問題を1件削除する（teacher/admin のみ）
 */
export async function deleteQuizQuestion(questionId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("quiz_questions")
    .delete()
    .eq("id", questionId);
  return !error;
}

/**
 * クイズを削除する（quiz_questions は CASCADE で連鎖削除）
 */
export async function deleteQuiz(quizId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("quizzes").delete().eq("id", quizId);
  return !error;
}

/**
 * 小テスト提出記録を保存する
 */
export async function createQuizAttempt(input: QuizAttemptInput): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("quiz_attempts").insert({
    quiz_id: input.quizId,
    user_id: input.userId,
    score: input.score,
    max_score: input.maxScore,
  });
  return !error;
}

/**
 * ユーザーが指定クイズを1回以上提出済みか確認する
 */
export async function hasCompletedQuiz(quizId: string, userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("quiz_attempts")
    .select("*", { count: "exact", head: true })
    .eq("quiz_id", quizId)
    .eq("user_id", userId);
  return (count ?? 0) > 0;
}
