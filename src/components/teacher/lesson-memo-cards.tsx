"use client";

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
    return <p className="text-sm text-muted-foreground">読み込み中...</p>;
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
    );
  }

  if (students === null) return null;

  if (students.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        該当する生徒が見つかりませんでした。
      </p>
    );
  }

  const memoStudentCount = students.filter((s) => s.memos.length > 0).length;

  return (
    <div className="space-y-3">
      {/* サマリー */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 rounded-md border bg-card text-sm">
        <span>
          対象生徒 <span className="font-bold">{students.length}</span> 人
        </span>
        <span>
          メモ記入 <span className="font-bold">{memoStudentCount}</span> 人
        </span>
      </div>

      <div className="flex flex-wrap gap-4">
        {students.map((student) => (
          <div
            key={student.id}
            className="w-72 h-96 rounded-md border flex flex-col bg-background"
          >
            {/* カードヘッダー */}
            <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
              <span className="text-xs text-muted-foreground w-12 shrink-0">
                {student.student_number ?? "—"}
              </span>
              <span className="flex-1 text-sm font-medium truncate">
                {student.display_name}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {student.memos.length} 件
              </span>
            </div>

            {/* カードボディ（スクロール可能） */}
            <div className="flex-1 overflow-y-auto p-3">
              {student.memos.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">メモはありません。</p>
              ) : (
                <div className="space-y-3">
                  {student.memos.map((memo) => (
                    <div key={memo.id} className="rounded-md border bg-muted/20 p-3">
                      <div className="text-xs text-muted-foreground mb-2">
                        {new Date(memo.created_at).toLocaleString("ja-JP")}
                        {memo.timestamp_seconds !== null && (
                          <span className="ml-2">
                            ▶ {Math.floor(memo.timestamp_seconds / 60)}:
                            {String(memo.timestamp_seconds % 60).padStart(2, "0")}
                          </span>
                        )}
                      </div>
                      <RichContent content={memo.content as Record<string, unknown>} />
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
