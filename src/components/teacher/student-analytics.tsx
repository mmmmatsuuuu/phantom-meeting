"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { SubjectWithUnits } from "@/lib/db/contents";
import type { StudentHeatmapResult } from "@/lib/db/quizzes";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const GRADES = [1, 2, 3];
const CLASSES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

type Props = {
  subjects: SubjectWithUnits[];
};

/** 得点率(0-100)からセル背景色を返す。既存の単元別ヒートマップと同じ色分け */
function getRateColor(rate: number | null): string {
  if (rate === null) return "#e5e7eb";
  if (rate < 40) return "#ef4444";
  if (rate < 70) return "#f97316";
  if (rate < 90) return "#eab308";
  return "#22c55e";
}

function getRateTextColor(rate: number | null): string {
  if (rate === null) return "#9ca3af";
  if (rate < 90) return "#ffffff";
  return "#1a1a1a";
}

const LEGEND = [
  { color: "#ef4444", label: "0〜40%" },
  { color: "#f97316", label: "40〜70%" },
  { color: "#eab308", label: "70〜90%" },
  { color: "#22c55e", label: "90〜100%" },
  { color: "#e5e7eb", label: "自己採点のみ / 未受験" },
] as const;

export default function StudentAnalytics({ subjects }: Props) {
  const [grade, setGrade] = useState<number | null>(null);
  const [classNum, setClassNum] = useState<number | "all" | null>(null);
  const [subjectId, setSubjectId] = useState<string>("");
  const [data, setData] = useState<StudentHeatmapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (grade === null || classNum === null || !subjectId) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setFetchError(null);
      const params = new URLSearchParams({
        subjectId,
        grade: String(grade),
        class: classNum === "all" ? "all" : String(classNum),
      });
      try {
        const res = await fetch(`/api/teacher/student-analytics?${params.toString()}`);
        const json = (await res.json()) as {
          data: StudentHeatmapResult | null;
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
  }, [grade, classNum, subjectId]);

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
            onChange={(e) => setSubjectId(e.target.value)}
          >
            <option value="">選択してください</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ローディング */}
      {loading && (
        <div className="rounded-md border overflow-hidden">
          <div className="animate-pulse space-y-px">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted" />
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

      {/* データなし */}
      {!loading && !fetchError && data && (data.lessons.length === 0 || data.students.length === 0) && (
        <div className="p-8 text-center text-muted-foreground text-sm border rounded-md">
          {data.lessons.length === 0
            ? "この科目には小テストのある授業がありません"
            : "対象の生徒がいません"}
        </div>
      )}

      {/* ヒートマップ */}
      {!loading && !fetchError && data && data.lessons.length > 0 && data.students.length > 0 && (
        <>
          <TooltipProvider>
            <div className="rounded-md border overflow-x-auto">
              <table className="text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-4 py-2.5 font-medium border-b border-r min-w-[180px] sticky left-0 bg-muted/50 z-10">
                      生徒
                    </th>
                    {data.lessons.map((lesson, i) => (
                      <th
                        key={lesson.lessonId}
                        className="px-2 py-2.5 font-medium border-b border-r text-center min-w-[64px]"
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-default text-xs">#{i + 1}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[220px] text-left">
                            <p className="text-xs opacity-80">{lesson.unitName}</p>
                            <p className="font-medium">{lesson.lessonTitle}</p>
                          </TooltipContent>
                        </Tooltip>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.students.map((student) => (
                    <tr key={student.userId} className="border-b">
                      <td className="px-4 py-2 border-r sticky left-0 bg-background z-10">
                        <Link
                          href={`/teacher/students/${student.userId}`}
                          className="hover:text-indigo-600 hover:underline transition-colors"
                        >
                          <span className="text-xs text-muted-foreground mr-2 font-mono">
                            {student.studentNumber ?? "—"}
                          </span>
                          <span className="font-medium">{student.displayName}</span>
                        </Link>
                      </td>
                      {data.lessons.map((lesson) => {
                        const hasAttempt = lesson.quizId in student.rates;
                        const rate = student.rates[lesson.quizId] ?? null;
                        return (
                          <td
                            key={lesson.lessonId}
                            className="border-r text-center px-2 py-2 text-xs font-medium"
                            style={
                              hasAttempt
                                ? {
                                    backgroundColor: getRateColor(rate),
                                    color: getRateTextColor(rate),
                                  }
                                : undefined
                            }
                          >
                            {hasAttempt ? (rate !== null ? `${rate}%` : "済") : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TooltipProvider>

          {/* 凡例 */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="font-medium">凡例:</span>
            {LEGEND.map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <span
                  className="inline-block w-3.5 h-3.5 rounded-sm border border-black/10"
                  style={{ backgroundColor: color }}
                />
                <span>{label}</span>
              </div>
            ))}
            <span>・生徒名クリックで個人詳細へ</span>
          </div>
        </>
      )}

      {/* フィルタ未選択時のヒント */}
      {!loading && !data && !fetchError && (
        <div className="p-8 text-center text-muted-foreground text-sm border rounded-md border-dashed">
          学年・クラス・科目を選択すると生徒×レッスンのヒートマップが表示されます
        </div>
      )}
    </div>
  );
}
