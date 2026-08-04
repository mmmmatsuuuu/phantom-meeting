"use client";

import { useEffect, useState } from "react";
import RichContent from "@/components/shared/rich-content";
import type { StudentWithMemoCount, Memo } from "@/lib/db/memos";

type Props = {
  lessonId: string;
  grade: number;
  classNum: number | "all";
};

function SkeletonMemos() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="rounded-md border p-3 space-y-2">
          <div className="h-3 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </div>
      ))}
    </div>
  );
}

/**
 * レッスン別分析タブ内の「メモ」サブタブ。学年・クラスは親（LessonAnalytics）の
 * 共有フィルタに従う（旧 StudentMemoViewer が持っていた独自のセレクト・
 * 「読み込む」ボタンは廃止し、他のサブタブと同様に選択時に自動取得する）。
 */
export default function LessonMemoCards({ lessonId, grade, classNum }: Props) {
  const [students, setStudents] = useState<StudentWithMemoCount[] | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [memosByUser, setMemosByUser] = useState<Record<string, Memo[]>>({});
  const [loadingUserIds, setLoadingUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const fetchMemos = async () => {
      setStudents(null);
      setMemosByUser({});
      setLoadingUserIds(new Set());
      setLoadingStudents(true);

      const params = new URLSearchParams({ grade: String(grade) });
      if (classNum !== "all") params.set("class", String(classNum));

      const res = await fetch(
        `/api/teacher/lessons/${lessonId}/memo-students?${params.toString()}`
      );
      const json = (await res.json()) as {
        data: StudentWithMemoCount[] | null;
        error: string | null;
      };
      if (cancelled) return;
      const studentList = json.data ?? [];
      setStudents(studentList);
      setLoadingStudents(false);

      // メモがある生徒のみ並列フェッチ
      const studentsWithMemos = studentList.filter((s) => s.memo_count > 0);
      if (studentsWithMemos.length === 0) return;

      setLoadingUserIds(new Set(studentsWithMemos.map((s) => s.id)));

      studentsWithMemos.forEach(async (student) => {
        const memoRes = await fetch(
          `/api/teacher/lessons/${lessonId}/memo-students/${student.id}`
        );
        const memoJson = (await memoRes.json()) as {
          data: Memo[] | null;
          error: string | null;
        };
        if (cancelled) return;
        setMemosByUser((prev) => ({
          ...prev,
          [student.id]: memoJson.data ?? [],
        }));
        setLoadingUserIds((prev) => {
          const next = new Set(prev);
          next.delete(student.id);
          return next;
        });
      });
    };

    fetchMemos();
    return () => {
      cancelled = true;
    };
  }, [lessonId, grade, classNum]);

  if (loadingStudents) {
    return <p className="text-sm text-muted-foreground">読み込み中...</p>;
  }

  if (students === null) return null;

  if (students.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        該当する生徒が見つかりませんでした。
      </p>
    );
  }

  const memoStudentCount = students.filter((s) => s.memo_count > 0).length;

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
        {students.map((student) => {
          const isLoading = loadingUserIds.has(student.id);
          const memos = memosByUser[student.id] ?? [];

          return (
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
                  {student.memo_count} 件
                </span>
              </div>

              {/* カードボディ（スクロール可能） */}
              <div className="flex-1 overflow-y-auto p-3">
                {isLoading ? (
                  <SkeletonMemos />
                ) : student.memo_count === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    メモはありません。
                  </p>
                ) : (
                  <div className="space-y-3">
                    {memos.map((memo) => (
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
          );
        })}
      </div>
    </div>
  );
}
