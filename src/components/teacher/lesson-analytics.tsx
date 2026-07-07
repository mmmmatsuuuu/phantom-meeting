"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { SubjectWithUnits } from "@/lib/db/contents";
import type { LessonQuizAnalyticsDetail } from "@/lib/db/quizzes";
import { tiptapDocToText } from "@/lib/tiptap-utils";

const GRADES = [1, 2, 3];
const CLASSES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: "選択式",
  short_answer: "記述式",
  ordering: "並び替え",
};

type Props = {
  subjects: SubjectWithUnits[];
};

function rateColor(rate: number): string {
  if (rate >= 0.8) return "text-green-600";
  if (rate >= 0.6) return "text-amber-600";
  return "text-red-500";
}

export default function LessonAnalytics({ subjects }: Props) {
  const [grade, setGrade] = useState<number | null>(null);
  const [classNum, setClassNum] = useState<number | "all" | null>(null);
  const [subjectId, setSubjectId] = useState<string>("");
  const [lessonId, setLessonId] = useState<string>("");
  const [data, setData] = useState<LessonQuizAnalyticsDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const selectedSubject = subjects.find((s) => s.id === subjectId);

  useEffect(() => {
    if (grade === null || classNum === null || !lessonId) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setFetchError(null);
      const params = new URLSearchParams({
        grade: String(grade),
        class: classNum === "all" ? "all" : String(classNum),
      });
      try {
        const res = await fetch(
          `/api/teacher/lessons/${lessonId}/quiz-analytics?${params.toString()}`
        );
        const json = (await res.json()) as {
          data: LessonQuizAnalyticsDetail | null;
          error: string | null;
        };
        if (json.error) {
          setFetchError(json.error);
        } else {
          setData(json.data);
        }
      } catch {
        setFetchError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [grade, classNum, lessonId]);

  return (
    <div className="space-y-6">
      {/* フィルタ */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-md border bg-muted/30">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">学年</label>
          <select
            className="px-3 py-1.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={grade ?? ""}
            onChange={(e) => {
              setGrade(e.target.value === "" ? null : Number(e.target.value));
              setClassNum(null);
            }}
          >
            <option value="">選択してください</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {g}年
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">クラス</label>
          <select
            className="px-3 py-1.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={classNum === null ? "" : String(classNum)}
            onChange={(e) => {
              const v = e.target.value;
              setClassNum(v === "" ? null : v === "all" ? "all" : Number(v));
            }}
            disabled={grade === null}
          >
            <option value="">選択してください</option>
            <option value="all">全クラス</option>
            {CLASSES.map((c) => (
              <option key={c} value={c}>
                {c}組
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">科目</label>
          <select
            className="px-3 py-1.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setLessonId("");
            }}
          >
            <option value="">選択してください</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">レッスン</label>
          <select
            className="px-3 py-1.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring max-w-[280px]"
            value={lessonId}
            onChange={(e) => setLessonId(e.target.value)}
            disabled={!selectedSubject}
          >
            <option value="">選択してください</option>
            {selectedSubject?.units.map((unit) => (
              <optgroup key={unit.id} label={unit.name}>
                {unit.lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {/* ローディング */}
      {loading && (
        <div className="rounded-md border overflow-hidden">
          <div className="animate-pulse space-y-px">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted" />
            ))}
          </div>
        </div>
      )}

      {/* エラー */}
      {!loading && fetchError && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm">
          {fetchError}
        </div>
      )}

      {/* 結果 */}
      {!loading && !fetchError && data && (
        <>
          {/* サマリー */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 rounded-md border bg-card text-sm">
            <span className="font-semibold">{data.lessonTitle}</span>
            <span>
              対象生徒 <span className="font-bold">{data.studentCount}</span> 人
            </span>
            <span>
              受験済み <span className="font-bold">{data.attemptedCount}</span> 人
            </span>
            <span>
              メモ記入 <span className="font-bold">{data.memoStudentCount}</span> 人
            </span>
            <Link
              href={`/teacher/lessons/${data.lessonId}/memos`}
              className="text-indigo-600 hover:underline"
            >
              📝 生徒のメモを見る →
            </Link>
          </div>

          {/* 設問カード */}
          <div className="space-y-4">
            {data.questions.map((q) => (
              <div key={q.id} className="rounded-lg border bg-card p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="text-sm font-semibold shrink-0">
                      Q{q.order + 1}.
                    </span>
                    <p className="text-sm">{tiptapDocToText(q.content) || "（問題文なし）"}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {TYPE_LABELS[q.type] ?? q.type}
                    </span>
                    {q.type !== "short_answer" && (
                      <span className="text-sm">
                        正答率{" "}
                        {q.correctRate !== null ? (
                          <span className={`font-bold ${rateColor(q.correctRate)}`}>
                            {Math.round(q.correctRate * 100)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        <span className="text-xs text-muted-foreground ml-1">
                          （{q.answerCount}人）
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 選択式：回答分布 */}
                {q.answerDistribution && (
                  <div className="space-y-1.5 pl-6">
                    {q.answerDistribution.map((dist) => (
                      <div key={dist.text} className="flex items-center gap-2 text-sm">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`truncate ${dist.isCorrect ? "font-medium" : ""}`}
                            >
                              {dist.isCorrect && (
                                <span className="text-green-600 mr-1">✓</span>
                              )}
                              {dist.text}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                dist.isCorrect ? "bg-green-500" : "bg-red-400"
                              }`}
                              style={{ width: `${Math.round(dist.rate * 100)}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground w-20 text-right shrink-0">
                          {dist.count}人（{Math.round(dist.rate * 100)}%）
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 記述式：模範解答とサンプル */}
                {q.type === "short_answer" && (
                  <div className="pl-6 space-y-2 text-sm">
                    {q.correctAnswerText && (
                      <div className="p-3 rounded-md bg-muted">
                        <span className="font-medium">模範解答: </span>
                        {q.correctAnswerText}
                      </div>
                    )}
                    {q.shortAnswerSamples.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground">
                          生徒の回答サンプル（最新回答からランダム{q.shortAnswerSamples.length}件 / 全{q.answerCount}件）
                        </p>
                        {q.shortAnswerSamples.map((sample, i) => (
                          <p key={i} className="p-2.5 rounded-md border bg-background">
                            {sample}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">まだ回答がありません</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* フィルタ未選択時のヒント */}
      {!loading && !data && !fetchError && (
        <div className="p-8 text-center text-muted-foreground text-sm border rounded-md border-dashed">
          学年・クラス・科目・レッスンを選択すると設問別の分析が表示されます
        </div>
      )}
    </div>
  );
}
