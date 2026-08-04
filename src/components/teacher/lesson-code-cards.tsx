"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LessonCodeResults, LessonCodeStudentState } from "@/lib/db/code-snippets";

type Props = {
  lessonId: string;
  grade: number;
  classNum: number | "all";
};

const LANGUAGE_LABELS: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
};

function SkeletonCards() {
  return (
    <div className="flex flex-wrap gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="w-72 h-96 rounded-md border p-4 animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-24 bg-muted rounded" />
          <div className="h-16 bg-muted rounded" />
        </div>
      ))}
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
  return (
    <div className="rounded-md border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{title}</span>
        <span className="text-[10px] text-muted-foreground">
          {LANGUAGE_LABELS[language] ?? language}
        </span>
      </div>

      {!state ? (
        <p className="text-xs text-muted-foreground">未編集</p>
      ) : (
        <>
          <p className="text-[10px] text-muted-foreground">
            {new Date(state.updatedAt).toLocaleString("ja-JP")} 更新
          </p>
          <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs font-mono bg-background rounded border p-2">
            {state.code || "（空）"}
          </pre>
          {state.lastOutput && (
            <>
              <p className="text-[10px] text-muted-foreground">実行結果:</p>
              <pre className="max-h-28 overflow-y-auto whitespace-pre-wrap text-xs font-mono bg-background rounded border p-2">
                {state.lastOutput}
              </pre>
            </>
          )}
        </>
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
export default function LessonCodeCards({ lessonId, grade, classNum }: Props) {
  const [data, setData] = useState<LessonCodeResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setFetchError(null);
      const params = new URLSearchParams({
        grade: String(grade),
        class: classNum === "all" ? "all" : String(classNum),
      });
      try {
        const res = await fetch(
          `/api/teacher/lessons/${lessonId}/code-analytics?${params.toString()}`
        );
        const json = (await res.json()) as {
          data: LessonCodeResults | null;
          error: string | null;
        };
        if (cancelled) return;
        if (json.error) {
          setFetchError(json.error);
        } else {
          setData(json.data);
        }
      } catch {
        if (!cancelled) setFetchError("コード実行状況の取得に失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [lessonId, grade, classNum]);

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

  const editedCount = data.students.filter(
    (s) => Object.keys(s.states).length > 0
  ).length;

  return (
    <div className="space-y-3">
      {/* サマリー */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 rounded-md border bg-card text-sm">
        <span>
          対象生徒 <span className="font-bold">{data.students.length}</span> 人
        </span>
        <span>
          編集済み <span className="font-bold">{editedCount}</span> 人
        </span>
      </div>

      <div className="flex flex-wrap gap-4">
        {data.students.map((student) => (
          <div
            key={student.userId}
            className="w-72 h-96 rounded-md border flex flex-col bg-background"
          >
            {/* カードヘッダー */}
            <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
              <span className="text-xs text-muted-foreground w-12 shrink-0">
                {student.studentNumber ?? "—"}
              </span>
              <Link
                href={`/teacher/students/${student.userId}`}
                className="flex-1 text-sm font-medium truncate hover:text-indigo-600 hover:underline transition-colors"
              >
                {student.displayName}
              </Link>
            </div>

            {/* カードボディ（スクロール可能） */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
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
        ))}
      </div>
    </div>
  );
}
