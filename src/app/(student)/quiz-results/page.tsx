import Link from "next/link";
import { getQuizResultsByUser } from "@/lib/db/quizzes";
import type { QuizAttemptResult } from "@/lib/db/quizzes";
import LessonAttemptHistory from "@/components/student/lesson-attempt-history";

// ─── 型定義 ────────────────────────────────────────────────────────

type FrequentlyMissed = { label: string };

type LessonResult = {
  lessonId: string;
  lessonTitle: string;
  lessonOrder: number;
  quizId: string;
  quizTitle: string;
  attempts: QuizAttemptResult[];
  recentMaxRate: number;
  recentAvgRate: number;
  frequentlyMissed: FrequentlyMissed[];
};

type UnitResult = {
  unitId: string;
  unitName: string;
  unitOrder: number;
  unitAvgRate: number;
  lessons: LessonResult[];
};

type SubjectResult = {
  subjectId: string;
  subjectName: string;
  subjectOrder: number;
  units: UnitResult[];
};

// ─── ユーティリティ ─────────────────────────────────────────────────

function toRate(score: number, maxScore: number): number {
  if (maxScore === 0) return 0;
  return Math.round((score / maxScore) * 100);
}

function computeLessonStats(attempts: QuizAttemptResult[]): {
  recentMaxRate: number;
  recentAvgRate: number;
} {
  const recent = attempts.slice(0, 3);
  if (recent.length === 0) return { recentMaxRate: 0, recentAvgRate: 0 };
  const rates = recent.map((a) => toRate(a.score, a.max_score));
  const recentMaxRate = Math.max(...rates);
  const recentAvgRate = Math.round(rates.reduce((s, r) => s + r, 0) / rates.length);
  return { recentMaxRate, recentAvgRate };
}

function computeFrequentlyMissed(attempts: QuizAttemptResult[]): FrequentlyMissed[] {
  const questionMap = new Map<string, { order: number; total: number; wrong: number }>();
  for (const attempt of attempts) {
    for (const ans of attempt.quiz_attempt_answers) {
      if (ans.is_correct === null) continue;
      const key = ans.quiz_questions.id;
      const entry = questionMap.get(key) ?? { order: ans.quiz_questions.order, total: 0, wrong: 0 };
      entry.total++;
      if (!ans.is_correct) entry.wrong++;
      questionMap.set(key, entry);
    }
  }
  return [...questionMap.values()]
    .filter((s) => s.total >= 2 && s.wrong > s.total / 2)
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ label: `Q${s.order + 1}` }));
}

function rateColor(rate: number): string {
  if (rate >= 80) return "text-green-600";
  if (rate >= 60) return "text-amber-600";
  return "text-red-500";
}

// ─── ツリー構築 ─────────────────────────────────────────────────────

function buildTree(attempts: QuizAttemptResult[]): SubjectResult[] {
  const lessonMap = new Map<string, QuizAttemptResult[]>();
  for (const a of attempts) {
    const id = a.quizzes.lessons.id;
    const list = lessonMap.get(id) ?? [];
    list.push(a);
    lessonMap.set(id, list);
  }

  const lessonInfoMap = new Map<
    string,
    { lessonId: string; lessonTitle: string; lessonOrder: number; quizId: string; quizTitle: string; unitId: string; unitName: string; unitOrder: number; subjectId: string; subjectName: string; subjectOrder: number }
  >();
  for (const a of attempts) {
    const l = a.quizzes.lessons;
    if (!lessonInfoMap.has(l.id)) {
      lessonInfoMap.set(l.id, {
        lessonId: l.id,
        lessonTitle: l.title,
        lessonOrder: l.order,
        quizId: a.quizzes.id,
        quizTitle: a.quizzes.title,
        unitId: l.units.id,
        unitName: l.units.name,
        unitOrder: l.units.order,
        subjectId: l.units.subjects.id,
        subjectName: l.units.subjects.name,
        subjectOrder: l.units.subjects.order,
      });
    }
  }

  const subjectMap = new Map<string, SubjectResult>();

  for (const info of lessonInfoMap.values()) {
    const lessonAttempts = (lessonMap.get(info.lessonId) ?? []).slice(0, 3);
    const { recentMaxRate, recentAvgRate } = computeLessonStats(lessonAttempts);
    const frequentlyMissed = computeFrequentlyMissed(lessonAttempts);

    const lesson: LessonResult = {
      lessonId: info.lessonId,
      lessonTitle: info.lessonTitle,
      lessonOrder: info.lessonOrder,
      quizId: info.quizId,
      quizTitle: info.quizTitle,
      attempts: lessonAttempts,
      recentMaxRate,
      recentAvgRate,
      frequentlyMissed,
    };

    if (!subjectMap.has(info.subjectId)) {
      subjectMap.set(info.subjectId, {
        subjectId: info.subjectId,
        subjectName: info.subjectName,
        subjectOrder: info.subjectOrder,
        units: [],
      });
    }
    const subject = subjectMap.get(info.subjectId)!;

    let unit = subject.units.find((u) => u.unitId === info.unitId);
    if (!unit) {
      unit = { unitId: info.unitId, unitName: info.unitName, unitOrder: info.unitOrder, unitAvgRate: 0, lessons: [] };
      subject.units.push(unit);
    }
    unit.lessons.push(lesson);
  }

  for (const subject of subjectMap.values()) {
    for (const unit of subject.units) {
      unit.lessons.sort((a, b) => a.lessonOrder - b.lessonOrder);
      const maxRates = unit.lessons.map((l) => l.recentMaxRate);
      unit.unitAvgRate = Math.round(maxRates.reduce((s, r) => s + r, 0) / maxRates.length);
    }
    subject.units.sort((a, b) => a.unitOrder - b.unitOrder);
  }

  return [...subjectMap.values()].sort((a, b) => a.subjectOrder - b.subjectOrder);
}

// ─── コンポーネント ──────────────────────────────────────────────────

export default async function QuizResultsPage() {
  const attempts = await getQuizResultsByUser();
  const tree = buildTree(attempts);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">小テスト結果一覧</h1>

      {tree.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-indigo-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75" />
            </svg>
          </div>
          <p className="text-muted-foreground text-sm">
            まだ小テストを受験していません。授業ページで小テストに挑戦してみましょう。
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {tree.map((subject) => (
            <section key={subject.subjectId}>
              <h2 className="text-xl font-bold border-b pb-3 mb-6">{subject.subjectName}</h2>
              <div className="space-y-8">
                {subject.units.map((unit) => (
                  <section key={unit.unitId}>
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-base font-semibold text-muted-foreground">{unit.unitName}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        単元平均{" "}
                        <span className={`font-bold ${rateColor(unit.unitAvgRate)}`}>
                          {unit.unitAvgRate}%
                        </span>
                      </span>
                    </div>

                    <div className="space-y-5 pl-4 border-l-2 border-indigo-100">
                      {unit.lessons.map((lesson) => (
                        <div key={lesson.lessonId} className="bg-card border rounded-lg p-5 space-y-3">
                          {/* レッスンヘッダー */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <Link
                                href={`/lessons/${lesson.lessonId}`}
                                className="font-medium hover:text-indigo-600 transition-colors"
                              >
                                {lesson.lessonTitle}
                              </Link>
                              <p className="text-xs text-muted-foreground mt-0.5">{lesson.quizTitle}</p>
                            </div>
                            {/* 統計（直近3回） */}
                            <div className="shrink-0 flex gap-4 text-sm">
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">最高</p>
                                <p className={`font-bold text-base ${rateColor(lesson.recentMaxRate)}`}>
                                  {lesson.recentMaxRate}%
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">平均</p>
                                <p className={`font-bold text-base ${rateColor(lesson.recentAvgRate)}`}>
                                  {lesson.recentAvgRate}%
                                </p>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">※ 統計は直近3回の受験が対象</p>

                          {/* 受験履歴（クライアントコンポーネント） */}
                          <LessonAttemptHistory
                            attempts={lesson.attempts}
                            frequentlyMissed={lesson.frequentlyMissed}
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
