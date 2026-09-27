import { createClient, getUser } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { tiptapDocToText } from "@/lib/tiptap-utils";
import { classOf, studentNumberRange } from "@/lib/student-number";

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
 * レッスンに紐づくクイズと問題一覧を取得する（ネスト select で1クエリ）
 */
export async function getQuizWithQuestions(
  lessonId: string
): Promise<QuizWithQuestions | null> {
  const supabase = await createClient();

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("*, questions:quiz_questions(*)")
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (quizError || !quiz) return null;

  return {
    ...quiz,
    questions: [...quiz.questions].sort((a, b) => a.order - b.order),
  };
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
  const user = await getUser();
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
  /** 小テストの平均正答率：記述式を除く全回答の正答数 ÷ 回答数。回答がなければ null */
  avgCorrectRate: number | null;
  /** 記述式を除く回答数 */
  answerCount: number;
  questions: QuizQuestionAnalytics[];
};

export type UnitAnalytics = {
  unitId: string;
  unitName: string;
  /** 単元の平均正答率：単元内の小テスト平均（null を除く）の単純平均。なければ null */
  avgCorrectRate: number | null;
  lessons: LessonAnalytics[];
};

export type QuizAnalyticsResult = {
  subjectId: string;
  subjectName: string;
  /** 科目の平均正答率：科目内のすべての小テスト平均（null を除く）の単純平均。なければ null */
  avgCorrectRate: number | null;
  /** 小テストのあるレッスンを持つ単元のみ（単元の order 順） */
  units: UnitAnalytics[];
};

/** null を除いた単純平均。値がなければ null */
function averageOf(rates: (number | null)[]): number | null {
  const values = rates.filter((r): r is number => r !== null);
  return values.length === 0 ? null : values.reduce((sum, r) => sum + r, 0) / values.length;
}

/**
 * 指定科目・クラスの全授業×設問の平均正答率と、小テスト・単元・科目ごとの平均正答率を取得する（teacher/admin 向け）
 * classNum: 数値でクラス指定、"all" で学年全体
 */
export async function getQuizAnalytics(
  subjectId: string,
  grade: number,
  classNum: number | "all"
): Promise<QuizAnalyticsResult | null> {
  const supabase = await createClient();
  const { min, max } = studentNumberRange(grade, classNum);

  // 科目→単元→レッスン→クイズ→設問のネスト select と、設問別の集計（RPC）を並列で取得する。
  // 集計は受験記録が1000行を超えても欠けないよう DB 側で行う（quiz_question_stats）
  const [{ data: subject }, { data: stats }] = await Promise.all([
    supabase
      .from("subjects")
      .select(
        "name, units(id, name, order, lessons(id, title, order, quizzes(id, quiz_questions(id, type, content, order))))"
      )
      .eq("id", subjectId)
      .single(),
    supabase.rpc("quiz_question_stats", {
      p_subject_id: subjectId,
      p_min_student_number: min,
      p_max_student_number: max,
    }),
  ]);
  if (!subject) return null;

  const statsByQuestion = new Map((stats ?? []).map((s) => [s.question_id, s]));

  const unitAnalytics: UnitAnalytics[] = [];
  for (const unit of [...subject.units].sort((a, b) => a.order - b.order)) {
    const lessonAnalytics: LessonAnalytics[] = [];
    for (const lesson of [...unit.lessons].sort((a, b) => a.order - b.order)) {
      const quiz = lesson.quizzes[0];
      if (!quiz) continue;
      const qs = [...quiz.quiz_questions].sort((a, b) => a.order - b.order);
      if (qs.length === 0) continue;

      let correctTotal = 0;
      let answerTotal = 0;
      const questionAnalytics: QuizQuestionAnalytics[] = qs.map((q) => {
        const stat = statsByQuestion.get(q.id);
        const isShortAnswer = q.type === "short_answer";
        if (!isShortAnswer && stat) {
          correctTotal += stat.correct_count;
          answerTotal += stat.total_count;
        }
        return {
          id: q.id,
          order: q.order,
          type: q.type as QuizQuestionType,
          content: q.content as Record<string, unknown>,
          avgCorrectRate:
            isShortAnswer || !stat || stat.total_count === 0
              ? null
              : stat.correct_count / stat.total_count,
          answerCount: stat?.total_count ?? 0,
        };
      });

      lessonAnalytics.push({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        avgCorrectRate: answerTotal > 0 ? correctTotal / answerTotal : null,
        answerCount: answerTotal,
        questions: questionAnalytics,
      });
    }
    if (lessonAnalytics.length === 0) continue;

    unitAnalytics.push({
      unitId: unit.id,
      unitName: unit.name,
      avgCorrectRate: averageOf(lessonAnalytics.map((l) => l.avgCorrectRate)),
      lessons: lessonAnalytics,
    });
  }

  return {
    subjectId,
    subjectName: subject.name,
    avgCorrectRate: averageOf(
      unitAnalytics.flatMap((u) => u.lessons.map((l) => l.avgCorrectRate))
    ),
    units: unitAnalytics,
  };
}

// ─── レッスン別分析（教員向け・生徒×設問） ──────────────────────────

export type LessonQuizQuestionMeta = {
  id: string;
  order: number;
  type: QuizQuestionType;
  content: Record<string, unknown>;
  /** 正解のテキスト表現（選択式: 正解選択肢 / 並び替え: 正解順 / 記述式: 模範解答） */
  correctAnswerText: string;
};

export type LessonQuizStudentAnswer = {
  /** null = 記述式（自己採点） */
  isCorrect: boolean | null;
  /** 生徒の回答内容（選択式: 選んだ選択肢 / 並び替え: 回答順 / 記述式: 記入内容） */
  answerText: string;
};

export type LessonQuizStudentRow = {
  userId: string;
  displayName: string;
  studentNumber: number | null;
  attempted: boolean;
  score: number | null;
  maxScore: number | null;
  /** questionId → 最新受験の回答。未回答の設問はキーなし */
  answers: Record<string, LessonQuizStudentAnswer>;
  memoCount: number;
};

export type LessonQuizStudentResults = {
  lessonId: string;
  lessonTitle: string;
  /** null = このレッスンには小テストがない（questions は空、students はメモ件数のみ） */
  quizTitle: string | null;
  questions: LessonQuizQuestionMeta[];
  students: LessonQuizStudentRow[];
};

/**
 * 指定レッスン・クラスの小テスト結果を生徒×設問のマトリクスで取得する（teacher/admin 向け）
 * 各生徒の最新受験のみを対象とする。レッスンが存在しない場合のみ null。
 *
 * 1クラス（最大99人）に限定しているため、受験記録・メモは通常の select で
 * max_rows（1000行）に収まる。回答は受験記録にネストして取得する（ネストした行は上限の対象外）。
 */
export async function getLessonQuizResultsByStudent(
  lessonId: string,
  grade: number,
  classNum: number
): Promise<LessonQuizStudentResults | null> {
  const supabase = await createClient();
  const { min, max } = studentNumberRange(grade, classNum);

  // 4クエリを並列で取得する。受験記録は小テストのレッスンで絞り込むため、小テストIDを先に知る必要はない
  const [{ data: lesson }, { data: profiles }, { data: memoRows }, { data: attempts }] =
    await Promise.all([
      supabase
        .from("lessons")
        .select(
          "id, title, quizzes(id, title, quiz_questions(id, type, content, correct_answer, options, order))"
        )
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
        .from("memos")
        .select("user_id, profiles!inner(student_number)")
        .eq("lesson_id", lessonId)
        .gte("profiles.student_number", min)
        .lte("profiles.student_number", max),
      supabase
        .from("quiz_attempts")
        .select(
          "id, quiz_id, user_id, score, max_score, quiz_attempt_answers(question_id, answer, is_correct), quizzes!inner(lesson_id), profiles!inner(student_number)"
        )
        .eq("quizzes.lesson_id", lessonId)
        .gte("profiles.student_number", min)
        .lte("profiles.student_number", max)
        .order("submitted_at", { ascending: false }),
    ]);
  if (!lesson) return null;

  const quiz = lesson.quizzes[0] ?? null;

  const questions: LessonQuizQuestionMeta[] = [...(quiz?.quiz_questions ?? [])]
    .sort((a, b) => a.order - b.order)
    .map((q) => {
      let correctAnswerText = "";
      if (q.type === "multiple_choice") {
        const opts = (q.options as string[] | null) ?? [];
        const index = (q.correct_answer as { index?: number })?.index ?? -1;
        correctAnswerText = opts[index] ?? "";
      } else if (q.type === "ordering") {
        correctAnswerText = ((q.correct_answer as string[] | null) ?? []).join(" → ");
      } else {
        correctAnswerText = (q.correct_answer as { text?: string })?.text?.trim() ?? "";
      }
      return {
        id: q.id,
        order: q.order,
        type: q.type as QuizQuestionType,
        content: q.content as Record<string, unknown>,
        correctAnswerText,
      };
    });

  const questionTypeById = new Map(questions.map((q) => [q.id, q.type]));

  // 生徒ごとのメモ件数
  const memoCountByUser = new Map<string, number>();
  for (const memo of memoRows ?? []) {
    memoCountByUser.set(memo.user_id, (memoCountByUser.get(memo.user_id) ?? 0) + 1);
  }

  // 生徒ごとの最新受験（submitted_at の降順なので最初に出てきたものが最新）
  const latestByUser = new Map<string, NonNullable<typeof attempts>[number]>();
  for (const attempt of attempts ?? []) {
    if (attempt.quiz_id !== quiz?.id) continue;
    if (!latestByUser.has(attempt.user_id)) latestByUser.set(attempt.user_id, attempt);
  }

  const students: LessonQuizStudentRow[] = (profiles ?? []).map((p) => {
    const latest = latestByUser.get(p.id);
    const answers: Record<string, LessonQuizStudentAnswer> = {};
    for (const ans of latest?.quiz_attempt_answers ?? []) {
      const type = questionTypeById.get(ans.question_id);
      if (!type) continue;
      answers[ans.question_id] = {
        isCorrect: ans.is_correct,
        answerText: toAnswerText(type, ans.answer as Record<string, unknown> | null),
      };
    }
    return {
      userId: p.id,
      displayName: p.display_name,
      studentNumber: p.student_number,
      attempted: latest !== undefined,
      score: latest?.score ?? null,
      maxScore: latest?.max_score ?? null,
      answers,
      memoCount: memoCountByUser.get(p.id) ?? 0,
    };
  });

  return {
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    quizTitle: quiz?.title ?? null,
    questions,
    students,
  };
}

/** 回答 JSON を表示用テキストにする（選択式: 選んだ選択肢 / 並び替え: 回答順 / 記述式: 記入内容） */
function toAnswerText(type: QuizQuestionType, answer: Record<string, unknown> | null): string {
  if (type === "multiple_choice") {
    return String(answer?.selectedText ?? "");
  }
  if (type === "ordering") {
    const items = answer?.items;
    return Array.isArray(items) ? items.map(String).join(" → ") : "";
  }
  return String(answer?.text ?? "").trim();
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
  correctAnswerText: string | null;
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
  const { min, max } = studentNumberRange(grade, "all");

  // 単元→レッスン→小テスト→設問、学年の生徒（人数とクラス一覧用）、設問ごとの集計（RPC）を並列で取得する。
  // 集計は受験記録・回答が多くても欠けないよう DB 側で行う（unit_quiz_export_stats）
  const [{ data: unit }, { data: profiles }, { data: statRows }] = await Promise.all([
    supabase
      .from("units")
      .select(
        "name, lessons(id, title, order, quizzes(id, quiz_questions(id, type, content, correct_answer, options, order)))"
      )
      .eq("id", unitId)
      .single(),
    supabase
      .from("profiles")
      .select("student_number")
      .eq("role", "student")
      .gte("student_number", min)
      .lte("student_number", max),
    supabase.rpc("unit_quiz_export_stats", {
      p_unit_id: unitId,
      p_min_student_number: min,
      p_max_student_number: max,
    }),
  ]);
  if (!unit) return null;

  const lessons = [...unit.lessons].sort((a, b) => a.order - b.order);
  if (lessons.length === 0) return null;
  if (lessons.every((l) => l.quizzes.length === 0)) return null;

  const students = profiles ?? [];
  const classes = [
    ...new Set(
      students
        .map((p) => (p.student_number !== null ? classOf(p.student_number) : 0))
        .filter((cls) => cls > 0)
    ),
  ].sort((a, b) => a - b);

  const statsByQuestion = new Map((statRows ?? []).map((s) => [s.question_id, s]));

  const lessonExportData: LessonExportData[] = [];

  for (const lesson of lessons) {
    const quiz = lesson.quizzes[0];
    if (!quiz) continue;

    const lessonQuestions = [...quiz.quiz_questions].sort((a, b) => a.order - b.order);
    if (lessonQuestions.length === 0) continue;

    const questionExportData: QuestionExportData[] = lessonQuestions.map((q) => {
      const type = q.type as QuizQuestionType;
      const stat = statsByQuestion.get(q.id);
      // クラス番号 → [正答数, 回答数]
      const classStats = (stat?.class_stats ?? {}) as Record<string, [number, number]>;
      const answerCounts = (stat?.answer_counts ?? {}) as Record<string, number>;

      const rawText = tiptapDocToText(q.content as Record<string, unknown>);
      const contentSummary =
        rawText.length > 50 ? rawText.slice(0, 50) + "…" : rawText;

      let overallRate: number | null = null;
      const classRates = new Map<number, number | null>();
      let overallTotal = 0;

      if (type !== "short_answer") {
        let overallCorrect = 0;
        for (const [correct, total] of Object.values(classStats)) {
          overallCorrect += correct;
          overallTotal += total;
        }
        if (overallTotal > 0) overallRate = overallCorrect / overallTotal;
        for (const cls of classes) {
          const cs = classStats[String(cls)];
          classRates.set(cls, cs && cs[1] > 0 ? cs[0] / cs[1] : null);
        }
      }

      // 選択式のみ回答分布を集計（並び替えは正答率のみ）
      let answerDistribution: AnswerDistributionItem[] | null = null;
      if (type === "multiple_choice" && overallTotal > 0) {
        const opts = (q.options as string[] | null) ?? [];
        const correctAnswer = q.correct_answer as { index?: number };
        const correctText = opts[correctAnswer?.index ?? -1] ?? "";
        answerDistribution = opts.map((opt) => ({
          text: opt,
          isCorrect: opt === correctText,
          count: answerCounts[opt] ?? 0,
          rate: (answerCounts[opt] ?? 0) / overallTotal,
        }));
      }

      // 記述式：正答例と、最新回答からランダム3件（抽出は DB 側）
      let correctAnswerText: string | null = null;
      let shortAnswerSamples: string[] = [];
      if (type === "short_answer") {
        const ca = q.correct_answer as { text?: string };
        correctAnswerText = ca?.text?.trim() || null;
        shortAnswerSamples = stat?.short_answer_samples ?? [];
      }

      return {
        questionOrder: q.order + 1,
        type,
        contentSummary,
        overallRate,
        classRates,
        answerDistribution,
        correctAnswerText,
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

// ─── 生徒の受験状況スナップショット ─────────────────────────────────

/** 要復習と判定する得点率の閾値（この値未満で要復習） */
export const REVIEW_RATE_THRESHOLD = 60;

export type QuizStatus = {
  quizId: string;
  /** 最新受験の得点率（0-100）。自動採点問題がないクイズは null */
  latestRate: number | null;
  attemptCount: number;
};

/** 得点率が要復習の水準か判定する */
export function isReviewNeeded(status: QuizStatus): boolean {
  return status.latestRate !== null && status.latestRate < REVIEW_RATE_THRESHOLD;
}

/**
 * 指定ユーザーの全クイズの受験状況（最新得点率・受験回数）を1クエリで取得する
 */
export async function getStudentQuizStatuses(userId: string): Promise<QuizStatus[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quiz_attempts")
    .select("quiz_id, score, max_score")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false })
    .limit(2000);
  if (!data) return [];

  const map = new Map<string, QuizStatus>();
  for (const attempt of data) {
    const existing = map.get(attempt.quiz_id);
    if (existing) {
      existing.attemptCount++;
    } else {
      map.set(attempt.quiz_id, {
        quizId: attempt.quiz_id,
        latestRate:
          attempt.max_score > 0
            ? Math.round((attempt.score / attempt.max_score) * 100)
            : null,
        attemptCount: 1,
      });
    }
  }
  return [...map.values()];
}

/**
 * 全クイズの ID とレッスン ID の対応を取得する
 */
export async function getQuizLessonPairs(): Promise<
  { id: string; lesson_id: string }[]
> {
  const supabase = await createClient();
  const { data } = await supabase.from("quizzes").select("id, lesson_id");
  return data ?? [];
}
