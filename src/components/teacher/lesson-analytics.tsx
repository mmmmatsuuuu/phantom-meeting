"use client";

import { useState } from "react";
import Link from "next/link";
import type { SubjectWithUnits } from "@/lib/db/contents";
import type {
  LessonQuizStudentResults,
  LessonQuizQuestionMeta,
  LessonQuizStudentRow,
} from "@/lib/db/quizzes";
import { tiptapDocToText } from "@/lib/tiptap-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import LessonCodeCards from "@/components/teacher/lesson-code-cards";
import LessonMemoCards from "@/components/teacher/lesson-memo-cards";
import { useLazyFetch } from "@/lib/hooks/use-lazy-fetch";
import { NO_DATA_LEVEL, RATE_LEVELS, formatRate, levelOf } from "@/lib/rate-level";
import RateBar from "@/components/teacher/rate-bar";

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

/** タイルの共通スタイル */
const TILE = "h-7 rounded-md flex items-center justify-center px-2 text-xs font-semibold cursor-default";

/** 設問セル：正解は○、誤答は✕（ホバーで生徒の回答と正解）、記述式は記入内容を表示する */
function AnswerCell({
  question,
  row,
}: {
  question: LessonQuizQuestionMeta;
  row: LessonQuizStudentRow;
}) {
  const answer = row.answers[question.id];

  if (!answer) {
    return <div className={`${TILE} bg-muted/50 text-muted-foreground font-normal`}>—</div>;
  }

  // 記述式：記入内容をそのまま表示（ホバーで全文）
  if (question.type === "short_answer") {
    if (!answer.answerText) {
      return (
        <div className={`${TILE} bg-muted/50 text-muted-foreground font-normal`}>未記入</div>
      );
    }
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`${TILE} ${NO_DATA_LEVEL.tile} font-normal justify-start max-w-[180px]`}>
            <span className="truncate">{answer.answerText}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[320px] text-left whitespace-pre-wrap">
          {answer.answerText}
        </TooltipContent>
      </Tooltip>
    );
  }

  // 選択式・並び替え：正解は○、誤答は✕（生徒の回答と正解はホバーで表示）
  if (answer.isCorrect) {
    return <div className={`${TILE} ${RATE_LEVELS[0].tile} text-sm`}>○</div>;
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`${TILE} ${RATE_LEVELS[RATE_LEVELS.length - 1].tile} text-sm`}>✕</div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[320px] text-left">
        <p className="text-xs opacity-80 mb-1">生徒の回答:</p>
        <p>{answer.answerText || "（無回答）"}</p>
        <p className="text-xs opacity-80 mt-1.5 mb-1">正解:</p>
        <p>{question.correctAnswerText}</p>
      </TooltipContent>
    </Tooltip>
  );
}

type Tab = "quiz" | "code" | "memo";

export default function LessonAnalytics({ subjects }: Props) {
  const [grade, setGrade] = useState<number | null>(null);
  const [classNum, setClassNum] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<string>("");
  const [lessonId, setLessonId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<Tab>("quiz");

  const filterReady = grade !== null && classNum !== null && lessonId !== "";
  const query = filterReady ? `grade=${grade}&class=${classNum}` : "";

  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const selectedLesson = selectedSubject?.units
    .flatMap((u) => u.lessons)
    .find((l) => l.id === lessonId);
  const playgroundEnabled = selectedLesson?.enable_playground ?? false;
  // コードタブを開いたままプレイグラウンドのないレッスンに切り替えたら、小テストタブを表示する
  const effectiveTab: Tab = !playgroundEnabled && activeTab === "code" ? "quiz" : activeTab;

  // 小テストタブを開いているときだけ取得する（同じ条件で取得済みなら再取得しない）
  const {
    data: quizData,
    error: fetchError,
    loading,
  } = useLazyFetch<LessonQuizStudentResults>(
    filterReady ? `/api/teacher/lessons/${lessonId}/quiz-analytics?${query}` : null,
    effectiveTab === "quiz"
  );

  const hasQuiz = quizData?.quizTitle !== null;
  const attemptedCount = quizData?.students.filter((s) => s.attempted).length ?? 0;
  const memoStudentCount = quizData?.students.filter((s) => s.memoCount > 0).length ?? 0;

  // クラス平均得点率：受験済みの生徒の最新受験の得点率（得点 ÷ 満点）の平均
  const scoreRates = (quizData?.students ?? [])
    .filter((s) => s.attempted && s.maxScore !== null && s.maxScore > 0 && s.score !== null)
    .map((s) => (s.score as number) / (s.maxScore as number));
  const avgScoreRate =
    scoreRates.length > 0 ? scoreRates.reduce((sum, r) => sum + r, 0) / scoreRates.length : null;

  // 設問ごとのクラスの正答率：回答した生徒のうち正解の割合（記述式は対象外）
  const questionRates = new Map<string, number | null>();
  for (const q of quizData?.questions ?? []) {
    if (q.type === "short_answer") continue;
    const answers = (quizData?.students ?? [])
      .map((s) => s.answers[q.id])
      .filter((a) => a !== undefined);
    questionRates.set(
      q.id,
      answers.length > 0 ? answers.filter((a) => a.isCorrect).length / answers.length : null
    );
  }

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
              setClassNum(v === "" ? null : Number(v));
            }}
            disabled={grade === null}
          >
            <option value="">選択してください</option>
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

      {grade !== null && classNum !== null && lessonId && (
        <>
          {/* サブタブ */}
          <div className="flex gap-1 border-b">
            {(
              [
                { key: "quiz", label: "📝 小テスト" },
                ...(playgroundEnabled ? [{ key: "code", label: "💻 コード" } as const] : []),
                { key: "memo", label: "📋 メモ" },
              ] as { key: Tab; label: string }[]
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  effectiveTab === tab.key
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* コード・メモは一度開いた結果を保持するため、非表示にするだけでアンマウントしない */}
          {playgroundEnabled && (
            <div hidden={effectiveTab !== "code"}>
              <LessonCodeCards
                lessonId={lessonId}
                grade={grade}
                classNum={classNum}
                active={effectiveTab === "code"}
              />
            </div>
          )}

          <div hidden={effectiveTab !== "memo"}>
            <LessonMemoCards
              lessonId={lessonId}
              grade={grade}
              classNum={classNum}
              active={effectiveTab === "memo"}
            />
          </div>
        </>
      )}

      {/* ローディング（小テスト） */}
      {effectiveTab === "quiz" && loading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-24 rounded-xl bg-muted" />
          <div className="h-72 rounded-xl bg-muted" />
        </div>
      )}

      {/* エラー */}
      {effectiveTab === "quiz" && !loading && fetchError && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm">
          {fetchError}
        </div>
      )}

      {/* 結果 */}
      {effectiveTab === "quiz" && !loading && !fetchError && quizData && (
        <TooltipProvider>
          <div className="space-y-5">
            {/* 凡例 */}
            {hasQuiz && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className={`inline-block w-3 h-3 rounded-sm ${RATE_LEVELS[0].tile}`} />
                  ○ 正解
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`inline-block w-3 h-3 rounded-sm ${RATE_LEVELS[RATE_LEVELS.length - 1].tile}`}
                  />
                  ✕ 誤答（ホバーで回答と正解）
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className={`inline-block w-3 h-3 rounded-sm ${NO_DATA_LEVEL.tile}`} />
                  記述（記入内容・ホバーで全文）／未受験
                </span>
                <span className="basis-full sm:basis-auto sm:ml-auto">
                  直近の受験結果のみ・生徒名クリックで個人詳細へ
                </span>
              </div>
            )}

            {/* サマリー */}
            <div className="rounded-xl border bg-card p-5 flex flex-wrap items-center gap-x-8 gap-y-3">
              {hasQuiz && (
                <div>
                  <p className="text-xs text-muted-foreground">クラス平均得点率</p>
                  <p
                    className={`text-4xl font-bold tabular-nums leading-tight ${levelOf(avgScoreRate).text}`}
                  >
                    {formatRate(avgScoreRate)}
                  </p>
                </div>
              )}
              <div className="flex-1 min-w-[200px] space-y-2">
                {hasQuiz && <RateBar rate={avgScoreRate} className="h-2.5" />}
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{quizData.lessonTitle}</span>
                  ・対象生徒 {quizData.students.length}人
                  {hasQuiz && `・受験済み ${attemptedCount}人`}
                  ・メモ記入 {memoStudentCount}人
                </p>
              </div>
            </div>

            {!hasQuiz ? (
              <div className="p-8 text-center text-muted-foreground text-sm border rounded-xl">
                このレッスンには小テストがありません
              </div>
            ) : quizData.students.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm border rounded-xl">
                対象の生徒がいません
              </div>
            ) : (
              /* 生徒×設問テーブル */
              <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto px-3 py-2">
                  <table className="text-sm border-separate border-spacing-1">
                    <thead>
                      <tr className="text-xs text-muted-foreground align-bottom">
                        <th className="sticky left-0 z-10 bg-card text-left font-medium px-2 py-1.5 min-w-[180px]">
                          生徒
                        </th>
                        <th className="font-medium px-2 py-1.5 w-16">得点</th>
                        <th aria-hidden className="w-2" />
                        {quizData.questions.map((q, i) => {
                          const qRate = questionRates.get(q.id) ?? null;
                          return (
                            <th key={q.id} className="font-medium px-1 py-1.5 min-w-16">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="cursor-default space-y-0.5">
                                    <div>Q{i + 1}</div>
                                    <div className="text-[10px] font-normal">
                                      {TYPE_LABELS[q.type] ?? q.type}
                                    </div>
                                    {q.type !== "short_answer" && (
                                      <div
                                        className={`text-[11px] font-semibold tabular-nums ${levelOf(qRate).text}`}
                                      >
                                        {formatRate(qRate)}
                                      </div>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[280px] text-left">
                                  <p className="text-xs opacity-80 line-clamp-4">
                                    {tiptapDocToText(q.content) || "（問題文なし）"}
                                  </p>
                                  {q.correctAnswerText && (
                                    <p className="mt-1.5 text-xs">
                                      正解: <span className="font-medium">{q.correctAnswerText}</span>
                                    </p>
                                  )}
                                  {q.type !== "short_answer" && (
                                    <p className="mt-1 text-xs">
                                      クラスの正答率: <span className="font-medium">{formatRate(qRate)}</span>
                                    </p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </th>
                          );
                        })}
                        <th aria-hidden className="w-2" />
                        <th className="font-medium px-2 py-1.5 w-14">メモ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quizData.students.map((row) => {
                        const scoreRate =
                          row.attempted && row.maxScore !== null && row.maxScore > 0 && row.score !== null
                            ? row.score / row.maxScore
                            : null;
                        return (
                          <tr key={row.userId} className="group">
                            <td className="sticky left-0 z-10 bg-card px-2 py-1 rounded-md group-hover:bg-muted/60 transition-colors">
                              <Link
                                href={`/teacher/students/${row.userId}`}
                                className="flex items-baseline gap-2 hover:text-indigo-600 transition-colors"
                              >
                                <span className="text-xs text-muted-foreground font-mono tabular-nums">
                                  {row.studentNumber ?? "—"}
                                </span>
                                <span className="font-medium truncate max-w-[160px]">
                                  {row.displayName}
                                </span>
                              </Link>
                            </td>
                            {row.attempted ? (
                              <>
                                <td className="p-0">
                                  <div
                                    className={`${TILE} w-16 text-sm font-bold tabular-nums ring-1 ring-inset ring-black/5 dark:ring-white/10 ${levelOf(scoreRate).tile}`}
                                  >
                                    {scoreRate !== null ? `${row.score}/${row.maxScore}` : "—"}
                                  </div>
                                </td>
                                <td aria-hidden className="p-0">
                                  <div className="mx-auto h-5 w-px bg-border" />
                                </td>
                                {quizData.questions.map((q) => (
                                  <td key={q.id} className="p-0">
                                    <AnswerCell question={q} row={row} />
                                  </td>
                                ))}
                              </>
                            ) : (
                              // 得点・区切り・設問の列をまとめて「未受験」と表示する
                              <td colSpan={quizData.questions.length + 2} className="p-0">
                                <div className={`${TILE} ${NO_DATA_LEVEL.tile} font-normal`}>
                                  未受験
                                </div>
                              </td>
                            )}
                            <td aria-hidden className="p-0">
                              <div className="mx-auto h-5 w-px bg-border" />
                            </td>
                            <td className="p-0">
                              {row.memoCount > 0 ? (
                                <div className={`${TILE} w-14 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300`}>
                                  📝 {row.memoCount}
                                </div>
                              ) : (
                                <div className={`${TILE} w-14 text-muted-foreground font-normal`}>—</div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </TooltipProvider>
      )}

      {/* フィルタ未選択時のヒント */}
      {!(grade !== null && classNum !== null && lessonId) && (
        <div className="p-8 text-center text-muted-foreground text-sm border rounded-md border-dashed">
          学年・クラス・科目・レッスンを選択すると生徒ごとの回答一覧が表示されます
        </div>
      )}
    </div>
  );
}
