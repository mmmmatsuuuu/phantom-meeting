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

export type QuizAttemptAnswerInput = {
  questionId: string;
  answer: Record<string, unknown>;
  isCorrect: boolean | null;
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
 * 小テスト提出記録と各問の回答詳細を保存する
 */
export async function createQuizAttempt(
  input: QuizAttemptInput,
  answers?: QuizAttemptAnswerInput[]
): Promise<boolean> {
  const supabase = await createClient();

  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .insert({
      quiz_id: input.quizId,
      user_id: input.userId,
      score: input.score,
      max_score: input.maxScore,
    })
    .select("id")
    .single();

  if (attemptError || !attempt) return false;

  if (answers && answers.length > 0) {
    const rows = answers.map((a) => ({
      attempt_id: attempt.id,
      question_id: a.questionId,
      answer: a.answer as Database["public"]["Tables"]["quiz_attempt_answers"]["Insert"]["answer"],
      is_correct: a.isCorrect,
    }));

    const { error: answersError } = await supabase
      .from("quiz_attempt_answers")
      .insert(rows);

    if (answersError) return false;
  }

  return true;
}

// ─── 小テスト結果一覧用の型 ───────────────────────────────────────

export type AttemptAnswerResult = {
  id: string;
  is_correct: boolean | null;
  quiz_questions: {
    id: string;
    type: Database["public"]["Enums"]["quiz_question_type"];
    order: number;
  };
};

export type QuizAttemptResult = {
  id: string;
  score: number;
  max_score: number;
  submitted_at: string;
  quizzes: {
    id: string;
    title: string;
    lessons: {
      id: string;
      title: string;
      units: {
        id: string;
        name: string;
        subjects: {
          id: string;
          name: string;
          order: number;
        };
      };
    };
  };
  quiz_attempt_answers: AttemptAnswerResult[];
};

/**
 * ログインユーザーの全受験履歴を階層情報と回答詳細つきで取得する
 */
export async function getQuizResultsByUser(): Promise<QuizAttemptResult[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("quiz_attempts")
    .select(`
      id,
      score,
      max_score,
      submitted_at,
      quizzes (
        id,
        title,
        lessons (
          id,
          title,
          units (
            id,
            name,
            subjects (
              id,
              name,
              order
            )
          )
        )
      ),
      quiz_attempt_answers (
        id,
        is_correct,
        quiz_questions (
          id,
          type,
          order
        )
      )
    `)
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false });

  if (error || !data) return [];
  return data as unknown as QuizAttemptResult[];
}

// ─── 直近の受験スコア取得（回答詳細付き） ────────────────────────────

export type RecentAttemptDetail = {
  score: number;
  max_score: number;
  submitted_at: string;
  quiz_attempt_answers: {
    is_correct: boolean | null;
    quiz_questions: { id: string; order: number };
  }[];
};

/**
 * 指定ユーザーの指定クイズ直近10回の受験を回答詳細付きで取得する
 */
export async function getRecentQuizAttemptsWithAnswers(
  quizId: string,
  userId: string
): Promise<RecentAttemptDetail[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select(`
      score,
      max_score,
      submitted_at,
      quiz_attempt_answers (
        is_correct,
        quiz_questions (
          id,
          order
        )
      )
    `)
    .eq("quiz_id", quizId)
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false })
    .limit(10);
  if (error || !data) return [];
  return data as unknown as RecentAttemptDetail[];
}

// ─── 教員向け分析用の型 ────────────────────────────────────────────

export type QuizQuestionAnalytics = {
  id: string;
  order: number;
  type: QuizQuestionType;
  content: Record<string, unknown>;
  avgCorrectRate: number | null; // null = short_answer or 回答なし
  answerCount: number;
};

export type LessonAnalytics = {
  lessonId: string;
  lessonTitle: string;
  unitName: string;
  questions: QuizQuestionAnalytics[];
};

export type QuizAnalyticsResult = {
  subjectId: string;
  subjectName: string;
  lessons: LessonAnalytics[];
};

/**
 * 指定科目・クラスの全授業×設問の平均正答率を取得する（teacher/admin 向け）
 * classNum: 数値でクラス指定、"all" で学年全体
 */
export async function getQuizAnalytics(
  subjectId: string,
  grade: number,
  classNum: number | "all"
): Promise<QuizAnalyticsResult | null> {
  const supabase = await createClient();

  const { data: subject } = await supabase
    .from("subjects")
    .select("name")
    .eq("id", subjectId)
    .single();
  if (!subject) return null;

  const { data: units } = await supabase
    .from("units")
    .select("id, name")
    .eq("subject_id", subjectId)
    .order("order");

  const emptyResult: QuizAnalyticsResult = {
    subjectId,
    subjectName: subject.name,
    lessons: [],
  };

  if (!units || units.length === 0) return emptyResult;

  const unitIds = units.map((u) => u.id);
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title, unit_id")
    .in("unit_id", unitIds)
    .order("order");
  if (!lessons || lessons.length === 0) return emptyResult;

  const lessonIds = lessons.map((l) => l.id);

  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, lesson_id")
    .in("lesson_id", lessonIds);
  if (!quizzes || quizzes.length === 0) return emptyResult;

  const quizIds = quizzes.map((q) => q.id);
  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("id, quiz_id, type, content, order")
    .in("quiz_id", quizIds)
    .order("order");
  if (!questions) return null;

  // フィルタされた生徒IDを取得
  let profilesQuery = supabase
    .from("profiles")
    .select("id")
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

  const { data: profiles } = await profilesQuery;
  const studentIds = (profiles ?? []).map((p) => p.id);

  const questionStats = new Map<string, { correct: number; total: number }>();

  if (studentIds.length > 0) {
    // 各生徒・各クイズの最新受験IDを特定
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("id, quiz_id, user_id, submitted_at")
      .in("quiz_id", quizIds)
      .in("user_id", studentIds)
      .order("submitted_at", { ascending: false });

    if (attempts && attempts.length > 0) {
      const latestAttemptMap = new Map<string, string>();
      for (const attempt of attempts) {
        const key = `${attempt.user_id}_${attempt.quiz_id}`;
        if (!latestAttemptMap.has(key)) {
          latestAttemptMap.set(key, attempt.id);
        }
      }
      const latestAttemptIds = Array.from(latestAttemptMap.values());

      const { data: answers } = await supabase
        .from("quiz_attempt_answers")
        .select("question_id, is_correct")
        .in("attempt_id", latestAttemptIds);

      for (const answer of answers ?? []) {
        if (answer.is_correct === null) continue;
        const stats = questionStats.get(answer.question_id) ?? { correct: 0, total: 0 };
        stats.total++;
        if (answer.is_correct) stats.correct++;
        questionStats.set(answer.question_id, stats);
      }
    }
  }

  // 授業・単元のマッピング
  const unitMap = new Map(units.map((u) => [u.id, u.name]));
  const quizByLesson = new Map(quizzes.map((q) => [q.lesson_id, q.id]));
  const questionsByQuiz = new Map<string, typeof questions>();
  for (const q of questions) {
    const list = questionsByQuiz.get(q.quiz_id) ?? [];
    list.push(q);
    questionsByQuiz.set(q.quiz_id, list);
  }

  const lessonAnalytics: LessonAnalytics[] = [];
  for (const lesson of lessons) {
    const quizId = quizByLesson.get(lesson.id);
    if (!quizId) continue;
    const qs = questionsByQuiz.get(quizId) ?? [];
    if (qs.length === 0) continue;

    const questionAnalytics: QuizQuestionAnalytics[] = qs.map((q) => {
      const stats = questionStats.get(q.id);
      const isShortAnswer = q.type === "short_answer";
      return {
        id: q.id,
        order: q.order,
        type: q.type as QuizQuestionType,
        content: q.content as Record<string, unknown>,
        avgCorrectRate:
          isShortAnswer || !stats || stats.total === 0
            ? null
            : stats.correct / stats.total,
        answerCount: stats?.total ?? 0,
      };
    });

    lessonAnalytics.push({
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      unitName: unitMap.get(lesson.unit_id) ?? "",
      questions: questionAnalytics,
    });
  }

  return { subjectId, subjectName: subject.name, lessons: lessonAnalytics };
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
