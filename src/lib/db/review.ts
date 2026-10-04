import { createClient } from "@/lib/supabase/server";
import { tiptapDocToText } from "@/lib/tiptap-utils";
import { toAnswerText, toCorrectAnswerText, type QuizQuestionType } from "@/lib/db/quizzes";
import type { ReviewData, ReviewLesson } from "@/lib/review-prompt";

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

/**
 * AI 振り返りプロンプト（Phase 19b）用に、指定ユーザーの1単元分の学習データを取得する。
 *
 * - 単元の構成（レッスン・発問・小テストの設問・初期コード）を1クエリで取得し、
 *   本人の受験記録・メモ・コードを並列で取得する（1人×1単元なので行数上限の影響はない）
 * - 教師・管理者は RLS 上は全生徒のデータを読めるため、本人以外のデータが混ざらないよう
 *   すべて userId で明示的に絞り込む
 */
export async function getUnitReviewData(
  unitId: string,
  userId: string
): Promise<ReviewData | null> {
  const supabase = await createClient();

  const { data: unit, error } = await supabase
    .from("units")
    .select(
      `name,
      subjects(name),
      lessons(
        id, title, order,
        questions(content, order),
        quizzes(id, quiz_questions(id, order, type, content, options, correct_answer)),
        code_snippets(id, title, language, initial_code, order)
      )`
    )
    .eq("id", unitId)
    .maybeSingle();

  if (error || !unit) return null;

  const lessons = [...unit.lessons].sort(byOrder);
  const lessonIds = lessons.map((l) => l.id);
  const quizIds = lessons.flatMap((l) => l.quizzes.map((q) => q.id));
  const snippetIds = lessons.flatMap((l) => l.code_snippets.map((s) => s.id));

  const [attemptsResult, memosResult, codeStatesResult] = await Promise.all([
    quizIds.length > 0
      ? supabase
          .from("quiz_attempts")
          .select("quiz_id, score, max_score, submitted_at, quiz_attempt_answers(question_id, answer, is_correct)")
          .eq("user_id", userId)
          .in("quiz_id", quizIds)
          .order("submitted_at", { ascending: false })
      : null,
    lessonIds.length > 0
      ? supabase
          .from("memos")
          .select("lesson_id, content, timestamp_seconds, created_at, posts(id)")
          .eq("user_id", userId)
          .in("lesson_id", lessonIds)
          .order("created_at")
      : null,
    snippetIds.length > 0
      ? supabase
          .from("code_states")
          .select("snippet_id, code, last_output")
          .eq("user_id", userId)
          .in("snippet_id", snippetIds)
      : null,
  ]);

  if (attemptsResult?.error || memosResult?.error || codeStatesResult?.error) return null;

  const attempts = attemptsResult?.data ?? [];
  const memos = memosResult?.data ?? [];
  const codeStates = new Map((codeStatesResult?.data ?? []).map((s) => [s.snippet_id, s]));

  const reviewLessons: ReviewLesson[] = lessons.map((lesson) => {
    const quiz = lesson.quizzes[0] ?? null;
    const quizQuestions = [...(quiz?.quiz_questions ?? [])].sort(byOrder);
    const typeById = new Map(quizQuestions.map((q) => [q.id, q.type as QuizQuestionType]));

    return {
      id: lesson.id,
      title: lesson.title,
      questions: [...lesson.questions].sort(byOrder).map((q) => q.content),
      quiz: quiz && {
        questions: quizQuestions.map((q, i) => ({
          id: q.id,
          number: i + 1,
          type: q.type as QuizQuestionType,
          contentText: tiptapDocToText(q.content as Record<string, unknown>),
          correctAnswerText: toCorrectAnswerText(q.type as QuizQuestionType, q.options, q.correct_answer),
        })),
        attempts: attempts
          .filter((a) => a.quiz_id === quiz.id)
          .map((a) => ({
            submittedAt: a.submitted_at,
            score: a.score,
            maxScore: a.max_score,
            answers: a.quiz_attempt_answers.flatMap((ans) => {
              const type = typeById.get(ans.question_id);
              if (!type) return [];
              return [{
                questionId: ans.question_id,
                isCorrect: ans.is_correct,
                answerText: toAnswerText(type, ans.answer as Record<string, unknown> | null),
              }];
            }),
          })),
      },
      memos: memos
        .filter((m) => m.lesson_id === lesson.id)
        .map((m) => ({
          text: tiptapDocToText(m.content as Record<string, unknown>),
          createdAt: m.created_at,
          hasTimestamp: m.timestamp_seconds !== null,
          shared: m.posts.length > 0,
        })),
      snippets: [...lesson.code_snippets].sort(byOrder).map((s) => {
        const state = codeStates.get(s.id);
        return {
          title: s.title,
          language: s.language,
          initialCode: s.initial_code,
          code: state?.code ?? null,
          lastOutput: state?.last_output ?? null,
        };
      }),
    };
  });

  return {
    subjectName: unit.subjects?.name ?? "",
    unitName: unit.name,
    lessons: reviewLessons,
  };
}
