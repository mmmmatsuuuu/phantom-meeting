import type { SubjectWithUnits } from "@/lib/db/contents";
import type { QuizStatus } from "@/lib/db/quizzes";
import { isReviewNeeded } from "@/lib/db/quizzes";

export type LessonBadge = {
  hasQuiz: boolean;
  attempted: boolean;
  /** 最新受験の得点率（0-100）。未受験・自動採点なしは null */
  latestRate: number | null;
  needsReview: boolean;
  memoCount: number;
};

export type DashboardSummary = {
  attemptedQuizCount: number;
  totalQuizCount: number;
  /** 受験済みクイズの最新得点率の平均。受験なしは null */
  avgRate: number | null;
  reviewCount: number;
  memoCount: number;
};

export type StudentDashboard = {
  summary: DashboardSummary;
  lessonBadges: Record<string, LessonBadge>;
};

/**
 * コンテンツツリー・受験状況・メモ件数から、学習状況のまとめとレッスンごとの状況を組み立てる。
 * まとめは教員の生徒詳細で、レッスンごとの状況は生徒の目次と教員の生徒詳細で使う
 */
export function buildStudentDashboard(
  subjects: SubjectWithUnits[],
  quizPairs: { id: string; lesson_id: string }[],
  statuses: QuizStatus[],
  memoCounts: Record<string, number>
): StudentDashboard {
  const quizByLesson = new Map(quizPairs.map((q) => [q.lesson_id, q.id]));
  const statusByQuiz = new Map(statuses.map((s) => [s.quizId, s]));

  const lessonBadges: Record<string, LessonBadge> = {};

  let totalQuizCount = 0;
  let attemptedQuizCount = 0;
  let reviewCount = 0;
  let memoCount = 0;
  const attemptedRates: number[] = [];

  for (const subject of subjects) {
    for (const unit of subject.units) {
      for (const lesson of unit.lessons) {
        const lessonMemoCount = memoCounts[lesson.id] ?? 0;
        memoCount += lessonMemoCount;

        const quizId = quizByLesson.get(lesson.id);
        if (!quizId) {
          lessonBadges[lesson.id] = {
            hasQuiz: false,
            attempted: false,
            latestRate: null,
            needsReview: false,
            memoCount: lessonMemoCount,
          };
          continue;
        }

        totalQuizCount++;
        const status = statusByQuiz.get(quizId);
        const attempted = status !== undefined;
        const latestRate = status?.latestRate ?? null;
        const needsReview = status !== undefined && isReviewNeeded(status);

        if (attempted) {
          attemptedQuizCount++;
          if (latestRate !== null) attemptedRates.push(latestRate);
        }
        if (needsReview) reviewCount++;

        lessonBadges[lesson.id] = {
          hasQuiz: true,
          attempted,
          latestRate,
          needsReview,
          memoCount: lessonMemoCount,
        };
      }
    }
  }

  const avgRate =
    attemptedRates.length > 0
      ? Math.round(
          attemptedRates.reduce((sum, r) => sum + r, 0) / attemptedRates.length
        )
      : null;

  return {
    summary: {
      attemptedQuizCount,
      totalQuizCount,
      avgRate,
      reviewCount,
      memoCount,
    },
    lessonBadges,
  };
}
