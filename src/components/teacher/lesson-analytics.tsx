"use client";

import { useState, useEffect } from "react";
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

/** 設問セル：正解は○、誤答は誤答内容、記述式は記入内容を表示する */
function AnswerCell({
  question,
  row,
}: {
  question: LessonQuizQuestionMeta;
  row: LessonQuizStudentRow;
}) {
  const answer = row.answers[question.id];

  if (!answer) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  // 記述式：記入内容をそのまま表示（ホバーで全文）
  if (question.type === "short_answer") {
    if (!answer.answerText) {
      return <span className="text-muted-foreground text-xs">未記入</span>;
    }
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="block max-w-[180px] truncate text-left text-xs cursor-default">
            {answer.answerText}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[320px] text-left whitespace-pre-wrap">
          {answer.answerText}
        </TooltipContent>
      </Tooltip>
    );
  }

  // 選択式・並び替え：正解は○、誤答は選んだ内容
  if (answer.isCorrect) {
    return <span className="text-green-600 font-bold">○</span>;
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block max-w-[160px] truncate text-left text-xs text-red-700 dark:text-red-400 cursor-default">
          ✕ {answer.answerText || "（無回答）"}
        </span>
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

export default function LessonAnalytics({ subjects }: Props) {
  const [grade, setGrade] = useState<number | null>(null);
  const [classNum, setClassNum] = useState<number | "all" | null>(null);
  const [subjectId, setSubjectId] = useState<string>("");
  const [lessonId, setLessonId] = useState<string>("");
  const [data, setData] = useState<LessonQuizStudentResults | null>(null);
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
          data: LessonQuizStudentResults | null;
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

  const attemptedCount = data?.students.filter((s) => s.attempted).length ?? 0;
  const memoStudentCount = data?.students.filter((s) => s.memoCount > 0).length ?? 0;

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

      {/* 結果 */}
      {!loading && !fetchError && data && (
        <>
          {/* サマリー */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 rounded-md border bg-card text-sm">
            <span className="font-semibold">{data.lessonTitle}</span>
            <span>
              対象生徒 <span className="font-bold">{data.students.length}</span> 人
            </span>
            <span>
              受験済み <span className="font-bold">{attemptedCount}</span> 人
            </span>
            <span>
              メモ記入 <span className="font-bold">{memoStudentCount}</span> 人
            </span>
            <Link
              href={`/teacher/lessons/${data.lessonId}/memos`}
              className="text-indigo-600 hover:underline"
            >
              📝 生徒のメモを見る →
            </Link>
          </div>

          {data.students.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm border rounded-md">
              対象の生徒がいません
            </div>
          ) : (
            <TooltipProvider>
              {/* 生徒×設問テーブル */}
              <div className="rounded-md border overflow-x-auto">
                <table className="text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-4 py-2.5 font-medium border-b border-r min-w-[170px] sticky left-0 bg-muted/50 z-10">
                        生徒
                      </th>
                      <th className="px-3 py-2.5 font-medium border-b border-r text-center w-[72px]">
                        得点
                      </th>
                      {data.questions.map((q, i) => (
                        <th
                          key={q.id}
                          className="px-3 py-2.5 font-medium border-b border-r text-center min-w-[80px]"
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-default">
                                Q{i + 1}
                                <span className="block text-[10px] font-normal text-muted-foreground">
                                  {TYPE_LABELS[q.type] ?? q.type}
                                </span>
                              </span>
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
                            </TooltipContent>
                          </Tooltip>
                        </th>
                      ))}
                      <th className="px-3 py-2.5 font-medium border-b text-center w-[64px]">
                        メモ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.students.map((row) => (
                      <tr key={row.userId} className="border-b">
                        <td className="px-4 py-2 border-r sticky left-0 bg-background z-10">
                          <Link
                            href={`/teacher/students/${row.userId}`}
                            className="hover:text-indigo-600 hover:underline transition-colors"
                          >
                            <span className="text-xs text-muted-foreground mr-2 font-mono">
                              {row.studentNumber ?? "—"}
                            </span>
                            <span className="font-medium">{row.displayName}</span>
                          </Link>
                        </td>
                        {row.attempted ? (
                          <>
                            <td className="px-3 py-2 border-r text-center">
                              {row.maxScore !== null && row.maxScore > 0 ? (
                                <span className="font-medium">
                                  {row.score}/{row.maxScore}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            {data.questions.map((q) => (
                              <td
                                key={q.id}
                                className={`px-3 py-2 border-r text-center ${
                                  row.answers[q.id] &&
                                  row.answers[q.id].isCorrect === false
                                    ? "bg-red-50 dark:bg-red-950/20"
                                    : ""
                                }`}
                              >
                                <AnswerCell question={q} row={row} />
                              </td>
                            ))}
                          </>
                        ) : (
                          <td
                            colSpan={data.questions.length + 1}
                            className="px-3 py-2 border-r text-center text-xs text-muted-foreground bg-muted/20"
                          >
                            未受験
                          </td>
                        )}
                        <td className="px-3 py-2 text-center">
                          {row.memoCount > 0 ? (
                            <span className="text-xs">📝 {row.memoCount}件</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 凡例 */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="font-medium">見方:</span>
                <span>
                  <span className="text-green-600 font-bold">○</span> = 正解
                </span>
                <span>
                  <span className="text-red-700 dark:text-red-400">✕ 選択内容</span> = 誤答（ホバーで正解を表示）
                </span>
                <span>記述式はそのまま記入内容を表示（ホバーで全文）</span>
                <span>直近の受験結果のみ・生徒名クリックで個人詳細へ</span>
              </div>
            </TooltipProvider>
          )}
        </>
      )}

      {/* フィルタ未選択時のヒント */}
      {!loading && !data && !fetchError && (
        <div className="p-8 text-center text-muted-foreground text-sm border rounded-md border-dashed">
          学年・クラス・科目・レッスンを選択すると生徒ごとの回答一覧が表示されます
        </div>
      )}
    </div>
  );
}
