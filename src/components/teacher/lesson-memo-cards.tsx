"use client";

import Link from "next/link";
import RichContent from "@/components/shared/rich-content";
import type { LessonMemoStudent } from "@/lib/db/memos";
import { useLazyFetch } from "@/lib/hooks/use-lazy-fetch";

type Props = {
  lessonId: string;
  grade: number;
  classNum: number;
  /** タブが開かれているか。開かれているときだけ取得する */
  active: boolean;
};

/**
 * レッスン別分析タブ内の「メモ」サブタブ。学年・クラスは親（LessonAnalytics）の
 * 共有フィルタに従う。クラス全員分のメモを1回のリクエストで取得し、生徒ごとのカードで表示する。
 */
export default function LessonMemoCards({ lessonId, grade, classNum, active }: Props) {
  // タブを開いているときだけ取得する（同じ条件で取得済みなら再取得しない）
  const { data: students, error, loading } = useLazyFetch<LessonMemoStudent[]>(
    `/api/teacher/lessons/${lessonId}/memos?grade=${grade}&class=${classNum}`,
    active,
    "メモの取得に失敗しました"
  );

  if (loading) {
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

  if (error) {
    return (
      <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
    );
  }

  if (students === null) return null;

  if (students.length === 0) {
    return <p className="text-sm text-muted-foreground">該当する生徒が見つかりませんでした。</p>;
  }

  const memoStudentCount = students.filter((s) => s.memos.length > 0).length;
  const memoTotal = students.reduce((n, s) => n + s.memos.length, 0);
  const memoRate = memoStudentCount / students.length;

  return (
    <div className="space-y-5">
      {/* サマリー */}
      <div className="rounded-xl border bg-card p-5 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div>
          <p className="text-xs text-muted-foreground">メモを書いた生徒</p>
          <p className="text-4xl font-bold tabular-nums leading-tight">
            {memoStudentCount}
            <span className="text-lg font-medium text-muted-foreground">
              {" "}
              / {students.length}人
            </span>
          </p>
        </div>
        <div className="flex-1 min-w-[200px] space-y-2">
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{ width: `${Math.round(memoRate * 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            メモの合計 <span className="font-medium text-foreground tabular-nums">{memoTotal}件</span>
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {students.map((student) => (
          <div
            key={student.id}
            className="h-96 rounded-xl border bg-card shadow-sm flex flex-col overflow-hidden"
          >
            {/* カードヘッダー */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30 shrink-0">
              <span className="text-xs text-muted-foreground font-mono tabular-nums shrink-0">
                {student.student_number ?? "—"}
              </span>
              <Link
                href={`/teacher/students/${student.id}`}
                className="flex-1 text-sm font-medium truncate hover:text-indigo-600 transition-colors"
              >
                {student.display_name}
              </Link>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 tabular-nums ${
                  student.memos.length > 0
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {student.memos.length}件
              </span>
            </div>

            {/* カードボディ（スクロール可能） */}
            <div className="flex-1 overflow-y-auto p-3">
              {student.memos.length === 0 ? (
                <div className="h-full rounded-lg border border-dashed flex items-center justify-center text-xs text-muted-foreground">
                  メモはありません
                </div>
              ) : (
                <div className="space-y-2">
                  {student.memos.map((memo) => (
                    <div key={memo.id} className="rounded-lg border bg-card overflow-hidden">
                      <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-muted/40 border-b text-[10px] text-muted-foreground">
                        <span>
                          {new Date(memo.created_at).toLocaleString("ja-JP", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {memo.timestamp_seconds !== null && (
                          <span className="font-mono tabular-nums">
                            ▶ {Math.floor(memo.timestamp_seconds / 60)}:
                            {String(memo.timestamp_seconds % 60).padStart(2, "0")}
                          </span>
                        )}
                      </div>
                      <div className="px-3 py-2 text-sm">
                        <RichContent content={memo.content as Record<string, unknown>} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
