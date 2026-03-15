import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type Quiz = Database["public"]["Tables"]["quizzes"]["Row"];
export type QuizQuestion = Database["public"]["Tables"]["quiz_questions"]["Row"];
export type QuizQuestionType = Database["public"]["Enums"]["quiz_question_type"];

export type QuizWithQuestions = Quiz & { questions: QuizQuestion[] };

export type CreateQuizQuestionInput = {
  type: QuizQuestionType;
  content: Record<string, unknown>; // tiptap JSON
  options: string[] | null;
  correctAnswer:
    | { index: number }       // multiple_choice
    | { text: string }        // short_answer
    | string[];               // ordering（正解順）
  order: number;
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
      content: q.content,
      options: q.options as Database["public"]["Tables"]["quiz_questions"]["Insert"]["options"],
      correct_answer: q.correctAnswer as Database["public"]["Tables"]["quiz_questions"]["Insert"]["correct_answer"],
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
 * クイズを削除する（quiz_questions は CASCADE で連鎖削除）
 */
export async function deleteQuiz(quizId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("quizzes").delete().eq("id", quizId);
  return !error;
}
