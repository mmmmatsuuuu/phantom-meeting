"use client";

import Link from "next/link";
import type { LessonCodeResults, LessonCodeStudentState } from "@/lib/db/code-snippets";
import { useLazyFetch } from "@/lib/hooks/use-lazy-fetch";

type Props = {
  lessonId: string;
  grade: number;
  classNum: number;
  /** タブが開かれているか。開かれているときだけ取得する */
  active: boolean;
};

const LANGUAGE_LABELS: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
};

function SkeletonCards() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-24 rounded-xl bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-96 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

function SnippetBlock({
  title,
  language,
  state,
}: {
  title: string;
  language: string;
  state: LessonCodeStudentState | undefined;
}) {
  if (!state) {
    return (
      <div className="rounded-lg border border-dashed px-3 py-2 flex items-center justify-between gap-2 text-muted-foreground">
        <span className="text-xs font-medium truncate">{title}</span>
        <span className="text-[10px] shrink-0">未編集</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-muted/40 border-b">
        <span className="text-xs font-medium truncate">{title}</span>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {LANGUAGE_LABELS[language] ?? language}・
          {new Date(state.updatedAt).toLocaleString("ja-JP", {
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs font-mono px-3 py-2">
        {state.code || "（空）"}
      </pre>
      {state.lastOutput && (
        <div className="border-t bg-muted/30">
          <p className="px-3 pt-1.5 text-[10px] font-medium text-muted-foreground">実行結果</p>
          <pre className="max-h-28 overflow-y-auto whitespace-pre-wrap text-xs font-mono px-3 pb-2 pt-0.5">
            {state.lastOutput}
          </pre>
        </div>
      )}
    </div>
  );
}

/**
 * レッスン別分析タブ内の「コード」サブタブ。生徒ごとにカードで表示し、
 * カード内でそのレッスンの全スニペット（コード・直近の実行結果）を縦に並べる。
 * 以前はテーブル+Tooltipで表示していたが、コードは読む・スクロールする・
 * コピーするといった操作が必要なためTooltipと相性が悪く、常時表示のカードに変更した。
 */
export default function LessonCodeCards({ lessonId, grade, classNum, active }: Props) {
  // タブを開いているときだけ取得する（同じ条件で取得済みなら再取得しない）
  const {
    data,
    error: fetchError,
    loading,
  } = useLazyFetch<LessonCodeResults>(
    `/api/teacher/lessons/${lessonId}/code-analytics?grade=${grade}&class=${classNum}`,
    active,
    "コード実行状況の取得に失敗しました"
  );

  if (loading) return <SkeletonCards />;

  if (fetchError) {
    return (
      <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm">
        {fetchError}
      </div>
    );
  }

  if (!data) return null;

  if (data.snippets.length === 0) {
    return <p className="text-sm text-muted-foreground">コード例が登録されていません</p>;
  }

  if (data.students.length === 0) {
    return <p className="text-sm text-muted-foreground">対象の生徒がいません</p>;
  }

  const editedCount = data.students.filter((s) => Object.keys(s.states).length > 0).length;
  const editedRate = editedCount / data.students.length;

  return (
    <div className="space-y-5">
      {/* サマリー */}
      <div className="rounded-xl border bg-card p-5 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div>
          <p className="text-xs text-muted-foreground">コードを編集した生徒</p>
          <p className="text-4xl font-bold tabular-nums leading-tight">
            {editedCount}
            <span className="text-lg font-medium text-muted-foreground">
              {" "}
              / {data.students.length}人
            </span>
          </p>
        </div>
        <div className="flex-1 min-w-[200px] space-y-2">
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{ width: `${Math.round(editedRate * 100)}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {data.snippets.map((snippet) => (
              <span key={snippet.id}>
                {snippet.title}：
                <span className="font-medium text-foreground tabular-nums">
                  {data.students.filter((s) => s.states[snippet.id]).length}人
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.students.map((student) => {
          const edited = Object.keys(student.states).length;
          return (
            <div
              key={student.userId}
              className="h-96 rounded-xl border bg-card shadow-sm flex flex-col overflow-hidden"
            >
              {/* カードヘッダー */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30 shrink-0">
                <span className="text-xs text-muted-foreground font-mono tabular-nums shrink-0">
                  {student.studentNumber ?? "—"}
                </span>
                <Link
                  href={`/teacher/students/${student.userId}`}
                  className="flex-1 text-sm font-medium truncate hover:text-indigo-600 transition-colors"
                >
                  {student.displayName}
                </Link>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 tabular-nums ${
                    edited > 0
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  編集 {edited}/{data.snippets.length}
                </span>
              </div>

              {/* カードボディ（スクロール可能） */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {data.snippets.map((snippet) => (
                  <SnippetBlock
                    key={snippet.id}
                    title={snippet.title}
                    language={snippet.language}
                    state={student.states[snippet.id]}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
