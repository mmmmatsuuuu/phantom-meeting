import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getContents } from "@/lib/db/contents";
import { getStudentQuizStatuses, getQuizLessonPairs } from "@/lib/db/quizzes";
import { getMemoCountsByLesson } from "@/lib/db/memos";
import { buildStudentDashboard } from "@/lib/student-dashboard";

type Props = {
  params: Promise<{ userId: string }>;
};

function rateColor(rate: number): string {
  if (rate >= 80) return "text-green-600";
  if (rate >= 60) return "text-amber-600";
  return "text-red-500";
}

export default async function StudentDetailPage({ params }: Props) {
  const { userId } = await params;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, student_number, note, role")
    .eq("id", userId)
    .single();

  if (!profile || profile.role !== "student") return notFound();

  const [subjects, quizPairs, statuses, memoCounts] = await Promise.all([
    getContents(),
    getQuizLessonPairs(),
    getStudentQuizStatuses(userId),
    getMemoCountsByLesson(userId),
  ]);
  const { summary, lessonBadges } = buildStudentDashboard(
    subjects,
    quizPairs,
    statuses,
    memoCounts
  );

  const quizByLesson = new Map(quizPairs.map((q) => [q.lesson_id, q.id]));
  const attemptCountByQuiz = new Map(statuses.map((s) => [s.quizId, s.attemptCount]));

  const summaryItems = [
    {
      label: "小テスト",
      value: `${summary.attemptedQuizCount}/${summary.totalQuizCount}`,
      sub: "受験",
      valueClass: "",
    },
    {
      label: "平均得点率",
      value: summary.avgRate !== null ? `${summary.avgRate}%` : "—",
      sub: "最新受験の平均",
      valueClass: summary.avgRate !== null ? rateColor(summary.avgRate) : "",
    },
    {
      label: "要復習",
      value: `${summary.reviewCount}`,
      sub: "レッスン",
      valueClass: summary.reviewCount > 0 ? "text-red-500" : "text-green-600",
    },
    {
      label: "メモ",
      value: `${summary.memoCount}`,
      sub: "件",
      valueClass: "",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* パンくず */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/teacher" className="hover:text-foreground transition-colors">
          教師ページ
        </Link>
        <span>/</span>
        <Link href="/teacher/students" className="hover:text-foreground transition-colors">
          生徒一覧
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{profile.display_name}</span>
      </nav>

      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold mb-1">
          {profile.display_name}
          <span className="text-base font-normal text-muted-foreground ml-3 font-mono">
            {profile.student_number ?? "学籍番号未設定"}
          </span>
        </h1>
        {profile.note && (
          <p className="text-sm text-muted-foreground">備考: {profile.note}</p>
        )}
      </div>

      {/* 全体サマリー */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaryItems.map((item) => (
          <div key={item.label} className="bg-card border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
            <p className={`text-2xl font-bold ${item.valueClass}`}>
              {item.value}
              <span className="text-xs font-normal text-muted-foreground ml-1">
                {item.sub}
              </span>
            </p>
          </div>
        ))}
      </div>

      {/* 単元・レッスン別の状況 */}
      {subjects.map((subject) => (
        <section key={subject.id} className="space-y-6">
          <h2 className="text-xl font-bold border-b pb-3">{subject.name}</h2>
          {subject.units.map((unit) => {
            const unitRates = unit.lessons
              .map((lesson) => lessonBadges[lesson.id])
              .filter((b) => b?.attempted && b.latestRate !== null)
              .map((b) => b.latestRate as number);
            const unitAvg =
              unitRates.length > 0
                ? Math.round(unitRates.reduce((s, r) => s + r, 0) / unitRates.length)
                : null;

            return (
              <div key={unit.id}>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-base font-semibold text-muted-foreground">
                    {unit.name}
                  </h3>
                  {unitAvg !== null && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      単元平均{" "}
                      <span className={`font-bold ${rateColor(unitAvg)}`}>{unitAvg}%</span>
                    </span>
                  )}
                </div>

                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-left">
                        <th className="px-4 py-2 font-medium">レッスン</th>
                        <th className="px-4 py-2 font-medium text-center w-28">
                          最新得点率
                        </th>
                        <th className="px-4 py-2 font-medium text-center w-24">
                          受験回数
                        </th>
                        <th className="px-4 py-2 font-medium text-center w-20">メモ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unit.lessons.map((lesson) => {
                        const badge = lessonBadges[lesson.id];
                        const quizId = quizByLesson.get(lesson.id);
                        const attemptCount = quizId
                          ? (attemptCountByQuiz.get(quizId) ?? 0)
                          : 0;
                        return (
                          <tr key={lesson.id} className="border-t">
                            <td className="px-4 py-2">{lesson.title}</td>
                            <td className="px-4 py-2 text-center">
                              {!badge?.hasQuiz ? (
                                <span className="text-xs text-muted-foreground">
                                  小テストなし
                                </span>
                              ) : !badge.attempted ? (
                                <span className="text-xs px-2 py-0.5 rounded-full border text-muted-foreground">
                                  未受験
                                </span>
                              ) : badge.latestRate !== null ? (
                                <span className={`font-bold ${rateColor(badge.latestRate)}`}>
                                  {badge.latestRate}%
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  自己採点
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-center text-muted-foreground">
                              {badge?.hasQuiz ? `${attemptCount}回` : "—"}
                            </td>
                            <td className="px-4 py-2 text-center text-muted-foreground">
                              {badge && badge.memoCount > 0 ? `${badge.memoCount}件` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
