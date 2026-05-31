import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { tiptapDocToText } from "@/lib/tiptap-utils";

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
      order: number;
      units: {
        id: string;
        name: string;
        order: number;
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
          order,
          units (
            id,
            name,
            order,
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
  unitId: string;
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

  const { data: profiles } = await profilesQuery.limit(2000);
  const studentIds = (profiles ?? []).map((p) => p.id);

  const questionStats = new Map<string, { correct: number; total: number }>();

  if (studentIds.length > 0) {
    // 各生徒・各クイズの最新受験IDを特定
    // Supabase デフォルト上限(1000件)を超えないよう limit を明示する
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("id, quiz_id, user_id, submitted_at")
      .in("quiz_id", quizIds)
      .in("user_id", studentIds)
      .order("submitted_at", { ascending: false })
      .limit(20000);

    if (attempts && attempts.length > 0) {
      const latestAttemptMap = new Map<string, string>();
      for (const attempt of attempts) {
        const key = `${attempt.user_id}_${attempt.quiz_id}`;
        if (!latestAttemptMap.has(key)) {
          latestAttemptMap.set(key, attempt.id);
        }
      }
      const latestAttemptIds = Array.from(latestAttemptMap.values());

      // .in() に大量の UUID を渡すと PostgREST の URL 長制限を超えて
      // クエリが失敗し全問 N/A になるため、チャンクに分割して取得する
      const CHUNK_SIZE = 100;
      const allAnswers: Array<{ question_id: string; is_correct: boolean | null }> = [];
      for (let i = 0; i < latestAttemptIds.length; i += CHUNK_SIZE) {
        const chunk = latestAttemptIds.slice(i, i + CHUNK_SIZE);
        const { data: chunkAnswers } = await supabase
          .from("quiz_attempt_answers")
          .select("question_id, is_correct")
          .in("attempt_id", chunk)
          .limit(CHUNK_SIZE * 30);
        if (chunkAnswers) {
          allAnswers.push(...chunkAnswers);
        }
      }

      for (const answer of allAnswers) {
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
      unitId: lesson.unit_id,
      unitName: unitMap.get(lesson.unit_id) ?? "",
      questions: questionAnalytics,
    });
  }

  return { subjectId, subjectName: subject.name, lessons: lessonAnalytics };
}

// ─── 小テスト結果エクスポート用の型 ──────────────────────────────────

export type AnswerDistributionItem = {
  text: string;
  isCorrect: boolean;
  count: number;
  rate: number;
};

export type QuestionExportData = {
  questionOrder: number;
  type: QuizQuestionType;
  contentSummary: string;
  overallRate: number | null;
  classRates: Map<number, number | null>;
  answerDistribution: AnswerDistributionItem[] | null;
  shortAnswerSamples: string[];
};

export type LessonExportData = {
  lessonTitle: string;
  questions: QuestionExportData[];
};

export type UnitExportData = {
  unitName: string;
  studentCount: number;
  grade: number;
  classes: number[];
  exportDate: string;
  lessons: LessonExportData[];
};

/**
 * 単元の小テスト結果をエクスポート用に集計する（teacher/admin 向け）
 * 各生徒の最新受験のみを集計対象とする。
 */
export async function getUnitQuizResultsForExport(
  unitId: string,
  grade: number
): Promise<UnitExportData | null> {
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

  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, lesson_id")
    .in("lesson_id", lessonIds);
  if (!quizzes || quizzes.length === 0) return null;

  const quizIds = quizzes.map((q) => q.id);
  const quizByLesson = new Map(quizzes.map((q) => [q.lesson_id, q.id]));

  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("id, quiz_id, type, content, correct_answer, options, order")
    .in("quiz_id", quizIds)
    .order("order");
  if (!questions) return null;

  // 対象学年の生徒を全員取得
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

  // student_number からクラス番号を判定 (GCNN 形式: 百の位 = クラス番号)
  const classSet = new Set<number>();
  const userClassMap = new Map<string, number>();
  for (const p of students) {
    if (p.student_number !== null) {
      const cls = Math.floor(p.student_number / 100) % 10;
      if (cls > 0) {
        classSet.add(cls);
        userClassMap.set(p.id, cls);
      }
    }
  }
  const classes = Array.from(classSet).sort((a, b) => a - b);

  // 各生徒・各クイズの最新受験IDを特定
  const latestAttemptIds: string[] = [];
  const attemptUserMap = new Map<string, string>();

  if (studentIds.length > 0) {
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("id, quiz_id, user_id, submitted_at")
      .in("quiz_id", quizIds)
      .in("user_id", studentIds)
      .order("submitted_at", { ascending: false })
      .limit(20000);

    if (attempts) {
      const latestMap = new Map<string, string>();
      for (const att of attempts) {
        const key = `${att.user_id}_${att.quiz_id}`;
        if (!latestMap.has(key)) {
          latestMap.set(key, att.id);
          attemptUserMap.set(att.id, att.user_id);
        }
      }
      latestAttemptIds.push(...latestMap.values());
    }
  }

  // 回答詳細をチャンク分割で取得
  type AnswerRow = {
    attempt_id: string;
    question_id: string;
    answer: Record<string, unknown>;
    is_correct: boolean | null;
  };

  const allAnswers: AnswerRow[] = [];
  const CHUNK_SIZE = 100;
  for (let i = 0; i < latestAttemptIds.length; i += CHUNK_SIZE) {
    const chunk = latestAttemptIds.slice(i, i + CHUNK_SIZE);
    const { data: chunkAnswers } = await supabase
      .from("quiz_attempt_answers")
      .select("attempt_id, question_id, answer, is_correct")
      .in("attempt_id", chunk)
      .limit(CHUNK_SIZE * 30);
    if (chunkAnswers) allAnswers.push(...(chunkAnswers as AnswerRow[]));
  }

  // 設問ごとに統計を集計
  type QuestionStats = {
    overall: { correct: number; total: number };
    byClass: Map<number, { correct: number; total: number }>;
    answerCounts: Map<string, number>;
    shortAnswerTexts: string[];
  };

  const statsMap = new Map<string, QuestionStats>();
  const questionLookup = new Map(questions.map((q) => [q.id, q]));

  for (const answer of allAnswers) {
    const userId = attemptUserMap.get(answer.attempt_id);
    if (!userId) continue;
    const q = questionLookup.get(answer.question_id);
    if (!q) continue;

    const stats = statsMap.get(q.id) ?? {
      overall: { correct: 0, total: 0 },
      byClass: new Map<number, { correct: number; total: number }>(),
      answerCounts: new Map<string, number>(),
      shortAnswerTexts: [],
    };

    if (q.type === "short_answer") {
      const text = String(
        (answer.answer as { text?: unknown })?.text ?? ""
      ).trim();
      if (text) stats.shortAnswerTexts.push(text);
    } else {
      stats.overall.total++;
      if (answer.is_correct) stats.overall.correct++;

      const cls = userClassMap.get(userId);
      if (cls) {
        const cs = stats.byClass.get(cls) ?? { correct: 0, total: 0 };
        cs.total++;
        if (answer.is_correct) cs.correct++;
        stats.byClass.set(cls, cs);
      }

      if (q.type === "multiple_choice") {
        const selectedText = String(
          (answer.answer as { selectedText?: unknown })?.selectedText ?? ""
        );
        if (selectedText) {
          stats.answerCounts.set(
            selectedText,
            (stats.answerCounts.get(selectedText) ?? 0) + 1
          );
        }
      }
    }

    statsMap.set(q.id, stats);
  }

  // 出力データを組み立て
  const lessonExportData: LessonExportData[] = [];

  for (const lesson of lessons) {
    const quizId = quizByLesson.get(lesson.id);
    if (!quizId) continue;

    const lessonQuestions = questions
      .filter((q) => q.quiz_id === quizId)
      .sort((a, b) => a.order - b.order);
    if (lessonQuestions.length === 0) continue;

    const questionExportData: QuestionExportData[] = lessonQuestions.map((q) => {
      const type = q.type as QuizQuestionType;
      const stats = statsMap.get(q.id);

      const rawText = tiptapDocToText(q.content as Record<string, unknown>);
      const contentSummary =
        rawText.length > 50 ? rawText.slice(0, 50) + "…" : rawText;

      let overallRate: number | null = null;
      const classRates = new Map<number, number | null>();

      if (type !== "short_answer") {
        if (stats && stats.overall.total > 0) {
          overallRate = stats.overall.correct / stats.overall.total;
        }
        for (const cls of classes) {
          const cs = stats?.byClass.get(cls);
          classRates.set(cls, cs && cs.total > 0 ? cs.correct / cs.total : null);
        }
      }

      // 選択式のみ回答分布を集計（並び替えは正答率のみ）
      let answerDistribution: AnswerDistributionItem[] | null = null;
      if (type === "multiple_choice" && stats && stats.overall.total > 0) {
        const opts = (q.options as string[] | null) ?? [];
        const correctAnswer = q.correct_answer as { index?: number };
        const correctText = opts[correctAnswer?.index ?? -1] ?? "";
        const total = stats.overall.total;
        answerDistribution = opts.map((opt) => ({
          text: opt,
          isCorrect: opt === correctText,
          count: stats.answerCounts.get(opt) ?? 0,
          rate: (stats.answerCounts.get(opt) ?? 0) / total,
        }));
      }

      // 記述式：最新回答からランダム3件
      let shortAnswerSamples: string[] = [];
      if (type === "short_answer" && stats && stats.shortAnswerTexts.length > 0) {
        const texts = [...stats.shortAnswerTexts];
        for (let i = texts.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [texts[i], texts[j]] = [texts[j], texts[i]];
        }
        shortAnswerSamples = texts.slice(0, 3);
      }

      return {
        questionOrder: q.order + 1,
        type,
        contentSummary,
        overallRate,
        classRates,
        answerDistribution,
        shortAnswerSamples,
      };
    });

    lessonExportData.push({
      lessonTitle: lesson.title,
      questions: questionExportData,
    });
  }

  return {
    unitName: unit.name,
    studentCount: students.length,
    grade,
    classes,
    exportDate: new Date().toISOString().split("T")[0],
    lessons: lessonExportData,
  };
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
