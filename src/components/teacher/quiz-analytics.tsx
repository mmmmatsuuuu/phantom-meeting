"use client";

import { useState } from "react";
import type { SubjectWithUnits } from "@/lib/db/contents";
import type { QuizAnalyticsResult } from "@/lib/db/quizzes";
import { tiptapDocToText } from "@/lib/tiptap-utils";
import { useLazyFetch } from "@/lib/hooks/use-lazy-fetch";
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

/** 正答率の段階。上から順に判定する（min 以上ならその段階） */
const RATE_LEVELS = [
  {
    min: 0.9,
    label: "90%以上",
    tile: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
    bar: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  {
    min: 0.7,
    label: "70〜90%",
    tile: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300",
    bar: "bg-yellow-400",
    text: "text-yellow-700 dark:text-yellow-400",
  },
  {
    min: 0.4,
    label: "40〜70%",
    tile: "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
    bar: "bg-orange-500",
    text: "text-orange-700 dark:text-orange-400",
  },
  {
    min: 0,
    label: "40%未満",
    tile: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
    bar: "bg-red-500",
    text: "text-red-700 dark:text-red-400",
  },
] as const;

const NO_DATA_LEVEL = {
  label: "N/A・未受験",
  tile: "bg-muted text-muted-foreground",
  bar: "bg-muted-foreground/30",
  text: "text-muted-foreground",
} as const;

function levelOf(rate: number | null) {
  if (rate === null) return NO_DATA_LEVEL;
  return RATE_LEVELS.find((l) => rate >= l.min) ?? RATE_LEVELS[RATE_LEVELS.length - 1];
}

function formatRate(rate: number | null): string {
  return rate === null ? "N/A" : `${Math.round(rate * 100)}%`;
}

/** 正答率の横棒 */
function RateBar({ rate, className = "" }: { rate: number | null; className?: string }) {
  return (
    <div className={`h-2 rounded-full bg-muted overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full ${levelOf(rate).bar}`}
        style={{ width: `${Math.round((rate ?? 0) * 100)}%` }}
      />
    </div>
  );
}

export default function QuizAnalytics({ subjects }: Props) {
  const [grade, setGrade] = useState<number | null>(null);
  const [classNum, setClassNum] = useState<number | "all" | null>(null);
  const [subjectId, setSubjectId] = useState<string>("");

  const filterReady = grade !== null && classNum !== null && subjectId !== "";
  const {
    data,
    error: fetchError,
    loading,
  } = useLazyFetch<QuizAnalyticsResult>(
    filterReady
      ? `/api/teacher/quiz-analytics?subjectId=${subjectId}&grade=${grade}&class=${classNum}`
      : null,
    true
  );

  const handleGradeChange = (value: number | null) => {
    setGrade(value);
    setClassNum(null);
  };

  // 新しい単元（order の大きい順）を上に表示する。単元内のレッスンは授業の順のまま
  const units = data ? [...data.units].reverse() : [];
  const quizCount = units.reduce((n, u) => n + u.lessons.length, 0);
  const targetLabel =
    grade !== null && classNum !== null
      ? `${grade}年${classNum === "all" ? "全クラス" : `${classNum}組`}`
      : "";

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
      </div>

      {/* ローディング */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-24 rounded-xl bg-muted" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {/* エラー */}
      {!loading && fetchError && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm">
          {fetchError}
        </div>
      )}

      {/* データなし */}
      {!loading && !fetchError && data && units.length === 0 && (
        <div className="p-8 text-center text-muted-foreground text-sm border rounded-md">
          この科目にはクイズのある授業がありません
        </div>
      )}

      {!loading && data && units.length > 0 && (
        <TooltipProvider>
          <div className="space-y-5">
            {/* 凡例 */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              {[...RATE_LEVELS, NO_DATA_LEVEL].map((level) => (
                <span key={level.label} className="inline-flex items-center gap-1.5">
                  <span className={`inline-block w-3 h-3 rounded-sm ${level.tile}`} />
                  {level.label}
                </span>
              ))}
              <span className="basis-full sm:basis-auto sm:ml-auto">
                平均：小テストは記述式を除く全回答の正答率／単元・科目は小テスト平均の単純平均
              </span>
            </div>

            {/* 科目平均 */}
            <div className="rounded-xl border bg-card p-5 flex flex-wrap items-center gap-x-8 gap-y-3">
              <div>
                <p className="text-xs text-muted-foreground">科目平均正答率</p>
                <p
                  className={`text-4xl font-bold tabular-nums leading-tight ${levelOf(data.avgCorrectRate).text}`}
                >
                  {formatRate(data.avgCorrectRate)}
                </p>
              </div>
              <div className="flex-1 min-w-[200px] space-y-2">
                <RateBar rate={data.avgCorrectRate} className="h-2.5" />
                <p className="text-xs text-muted-foreground">
                  {data.subjectName}・{targetLabel}・{units.length}単元・{quizCount}回の小テスト
                </p>
              </div>
            </div>

            {/* 単元ごとのヒートマップ */}
            {units.map((unit) => {
              const maxQuestions = Math.max(0, ...unit.lessons.map((l) => l.questions.length));
              return (
                <section
                  key={unit.unitId}
                  className="rounded-xl border bg-card shadow-sm overflow-hidden"
                >
                  <header className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 border-b bg-muted/30">
                    <h2 className="font-semibold">{unit.unitName}</h2>
                    <span className="text-xs text-muted-foreground">
                      小テスト {unit.lessons.length}回
                    </span>
                    <div className="ml-auto flex items-center gap-3 w-full sm:w-64">
                      <span className="text-xs text-muted-foreground shrink-0">単元平均</span>
                      <RateBar rate={unit.avgCorrectRate} className="flex-1" />
                      <span
                        className={`text-sm font-bold tabular-nums w-10 text-right ${levelOf(unit.avgCorrectRate).text}`}
                      >
                        {formatRate(unit.avgCorrectRate)}
                      </span>
                    </div>
                  </header>

                  <div className="overflow-x-auto px-3 py-2">
                    <table className="text-sm border-separate border-spacing-1">
                      <thead>
                        <tr className="text-xs text-muted-foreground">
                          <th className="sticky left-0 z-10 bg-card text-left font-medium px-2 py-1.5 min-w-[180px]">
                            授業
                          </th>
                          <th className="font-medium px-2 py-1.5 w-16">平均</th>
                          <th aria-hidden className="w-2" />
                          {Array.from({ length: maxQuestions }).map((_, i) => (
                            <th key={i} className="font-medium px-2 py-1.5 w-16">
                              Q{i + 1}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {unit.lessons.map((lesson) => {
                          const avgLevel = levelOf(lesson.avgCorrectRate);
                          return (
                            <tr key={lesson.lessonId} className="group">
                              <td className="sticky left-0 z-10 bg-card px-2 py-1 rounded-md group-hover:bg-muted/60 transition-colors">
                                <div className="font-medium truncate max-w-[220px]">
                                  {lesson.lessonTitle}
                                </div>
                              </td>

                              {/* 小テスト平均 */}
                              <td className="p-0">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={`h-7 w-16 rounded-md flex items-center justify-center text-sm font-bold tabular-nums ring-1 ring-inset ring-black/5 dark:ring-white/10 cursor-default ${avgLevel.tile}`}
                                    >
                                      {formatRate(lesson.avgCorrectRate)}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[240px] text-left">
                                    <p className="font-medium mb-1">小テストの平均正答率</p>
                                    <p className="text-xs opacity-80">
                                      記述式を除く全回答の正答率（{lesson.answerCount}回答）
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </td>

                              <td aria-hidden className="p-0">
                                <div className="mx-auto h-5 w-px bg-border" />
                              </td>

                              {/* 設問ごとの正答率 */}
                              {Array.from({ length: maxQuestions }).map((_, i) => {
                                const q = lesson.questions[i];
                                if (!q) {
                                  return <td key={i} className="p-0" />;
                                }
                                const rate = q.avgCorrectRate;
                                const questionText = tiptapDocToText(q.content);
                                return (
                                  <td key={i} className="p-0">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div
                                          className={`h-7 w-16 rounded-md flex items-center justify-center text-xs font-semibold tabular-nums cursor-default transition-transform group-hover:scale-[1.03] ${levelOf(rate).tile}`}
                                        >
                                          {q.type === "short_answer" ? "記述" : formatRate(rate)}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-[240px] text-left">
                                        <p className="font-medium mb-1">Q{i + 1}</p>
                                        <p className="text-xs opacity-80 line-clamp-3">
                                          {questionText || "（問題文なし）"}
                                        </p>
                                        {rate !== null && (
                                          <p className="mt-1.5 text-xs">
                                            平均正答率:{" "}
                                            <span className="font-medium">{formatRate(rate)}</span>
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>
        </TooltipProvider>
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
