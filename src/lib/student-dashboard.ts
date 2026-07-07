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

export type NextAction = {
  type: "review" | "continue";
  lessonId: string;
  lessonTitle: string;
  latestRate: number | null;
};

export type StudentDashboard = {
  summary: DashboardSummary;
  nextActions: NextAction[];
  lessonBadges: Record<string, LessonBadge>;
};

const MAX_REVIEW_ACTIONS = 2;

/**
 * コンテンツツリー・受験状況・メモ件数から生徒ダッシュボードの表示データを組み立てる
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
  const reviewCandidates: NextAction[] = [];
  let continueCandidate: NextAction | null = null;

  let totalQuizCount = 0;
  let attemptedQuizCount = 0;
  let reviewCount = 0;
  let memoCount = 0;
  const attemptedRates: number[] = [];

  // subjects は order 順に整列済みのため、レッスンの出現順 = 学習順として扱う
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
        if (needsReview) {
          reviewCount++;
          reviewCandidates.push({
            type: "review",
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            latestRate,
          });
        }
        if (!attempted && continueCandidate === null) {
          continueCandidate = {
            type: "continue",
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            latestRate: null,
          };
        }

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

  // 要復習（得点率が低い順）を最優先、次に未受験の最初のレッスン
  reviewCandidates.sort((a, b) => (a.latestRate ?? 0) - (b.latestRate ?? 0));
  const nextActions: NextAction[] = reviewCandidates.slice(0, MAX_REVIEW_ACTIONS);
  if (continueCandidate) nextActions.push(continueCandidate);

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
    nextActions,
    lessonBadges,
  };
}
