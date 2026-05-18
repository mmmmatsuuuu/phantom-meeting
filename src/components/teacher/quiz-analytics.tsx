"use client";

import { useState, useEffect } from "react";
import type { SubjectWithUnits } from "@/lib/db/contents";
import type { QuizAnalyticsResult } from "@/lib/db/quizzes";
import { tiptapDocToText } from "@/lib/tiptap-utils";
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

function getRateColor(rate: number | null): string {
  if (rate === null) return "#e5e7eb";
  if (rate < 0.4) return "#ef4444";
  if (rate < 0.7) return "#f97316";
  if (rate < 0.9) return "#eab308";
  return "#22c55e";
}

function getRateTextColor(rate: number | null): string {
  if (rate === null) return "#9ca3af";
  if (rate < 0.9) return "#ffffff";
  return "#1a1a1a";
}

const LEGEND = [
  { color: "#ef4444", label: "0〜40%" },
  { color: "#f97316", label: "40〜70%" },
  { color: "#eab308", label: "70〜90%" },
  { color: "#22c55e", label: "90〜100%" },
  { color: "#e5e7eb", label: "N/A / 未受験" },
] as const;

export default function QuizAnalytics({ subjects }: Props) {
  const [grade, setGrade] = useState<number | null>(null);
  const [classNum, setClassNum] = useState<number | "all" | null>(null);
  const [subjectId, setSubjectId] = useState<string>("");
  const [data, setData] = useState<QuizAnalyticsResult | null>(null);
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
        const res = await fetch(`/api/teacher/quiz-analytics?${params.toString()}`);
        const json = (await res.json()) as {
          data: QuizAnalyticsResult | null;
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

  const handleGradeChange = (value: number | null) => {
    setGrade(value);
    setClassNum(null);
  };

  const maxQuestions = data
    ? Math.max(0, ...data.lessons.map((l) => l.questions.length))
    : 0;

  return (
    <div className="space-y-6">
      {/* フィルタ */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-md border bg-muted/30">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">学年</label>
          <select
            className="px-3 py-1.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={grade ?? ""}
            onChange={(e) =>
              handleGradeChange(e.target.value === "" ? null : Number(e.target.value))
            }
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

        {grade !== null && classNum !== null && subjectId && (
          <span className="text-xs text-muted-foreground">
            {grade}年{classNum === "all" ? "全クラス" : `${classNum}組`} /{" "}
            {subjects.find((s) => s.id === subjectId)?.name}
          </span>
        )}
      </div>

      {/* ローディング */}
      {loading && (
        <div className="rounded-md border overflow-hidden">
          <div className="animate-pulse space-y-px">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted" />
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
      {!loading && !fetchError && data && data.lessons.length === 0 && (
        <div className="p-8 text-center text-muted-foreground text-sm border rounded-md">
          この科目にはクイズのある授業がありません
        </div>
      )}

      {/* ヒートマップ */}
      {!loading && data && data.lessons.length > 0 && (
        <>
          <TooltipProvider>
            <div className="rounded-md border overflow-x-auto">
              <table className="text-sm border-collapse w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-4 py-2.5 font-medium border-b border-r min-w-[200px] sticky left-0 bg-muted/50">
                      授業
                    </th>
                    {Array.from({ length: maxQuestions }).map((_, i) => (
                      <th
                        key={i}
                        className="px-3 py-2.5 font-medium border-b border-r text-center min-w-[68px]"
                      >
                        Q{i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.lessons.map((lesson) => (
                    <tr key={lesson.lessonId} className="border-b hover:bg-muted/10">
                      <td className="px-4 py-2.5 border-r sticky left-0 bg-background">
                        <div className="font-medium truncate max-w-[200px]">
                          {lesson.lessonTitle}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {lesson.unitName}
                        </div>
                      </td>
                      {Array.from({ length: maxQuestions }).map((_, i) => {
                        const q = lesson.questions[i];
                        if (!q) {
                          return (
                            <td key={i} className="px-3 py-2.5 border-r text-center">
                              <span className="text-xs text-muted-foreground">—</span>
                            </td>
                          );
                        }
                        const rate = q.avgCorrectRate;
                        const bg = getRateColor(rate);
                        const textColor = getRateTextColor(rate);
                        const label =
                          rate === null ? "N/A" : `${Math.round(rate * 100)}%`;
                        const questionText = tiptapDocToText(q.content);

                        return (
                          <td key={i} className="px-3 py-2.5 border-r text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className="inline-block px-2 py-1 rounded text-xs font-medium min-w-[44px] cursor-default"
                                  style={{ backgroundColor: bg, color: textColor }}
                                >
                                  {label}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[240px] text-left">
                                <p className="font-medium mb-1">Q{i + 1}</p>
                                <p className="text-xs opacity-80 line-clamp-3">
                                  {questionText || "（問題文なし）"}
                                </p>
                                {rate !== null && (
                                  <p className="mt-1.5 text-xs">
                                    平均正答率:{" "}
                                    <span className="font-medium">
                                      {Math.round(rate * 100)}%
                                    </span>
                                    <span className="opacity-70 ml-1">
                                      （{q.answerCount}人）
                                    </span>
                                  </p>
                                )}
                                {q.type === "short_answer" && (
                                  <p className="mt-1 text-xs opacity-70">
                                    記述式（自動採点なし）
                                  </p>
                                )}
                              </TooltipContent>
                            </Tooltip>
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
          </div>
        </>
      )}

      {/* フィルタ未選択時のヒント */}
      {!loading && !data && !fetchError && (
        <div className="p-8 text-center text-muted-foreground text-sm border rounded-md border-dashed">
          学年・クラス・科目を選択するとヒートマップが表示されます
        </div>
      )}
    </div>
  );
}
