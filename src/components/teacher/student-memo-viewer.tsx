"use client";

import { useState } from "react";
import RichContent from "@/components/shared/rich-content";
import type { StudentWithMemoCount, Memo } from "@/lib/db/memos";

type Props = { lessonId: string };

const GRADES = [1, 2, 3];
const CLASSES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

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

export default function StudentMemoViewer({ lessonId }: Props) {
  const [grade, setGrade] = useState<number | null>(null);
  const [classNum, setClassNum] = useState<number | null>(null);
  const [students, setStudents] = useState<StudentWithMemoCount[] | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [memosByUser, setMemosByUser] = useState<Record<string, Memo[]>>({});
  const [loadingUserIds, setLoadingUserIds] = useState<Set<string>>(new Set());

  const canLoad = grade !== null || classNum !== null;

  const handleLoad = async () => {
    if (!canLoad) return;
    setStudents(null);
    setMemosByUser({});
    setLoadingUserIds(new Set());
    setLoadingStudents(true);

    const params = new URLSearchParams();
    if (grade !== null) params.set("grade", String(grade));
    if (classNum !== null) params.set("class", String(classNum));

    const res = await fetch(
      `/api/teacher/lessons/${lessonId}/memo-students?${params.toString()}`
    );
    const json = (await res.json()) as {
      data: StudentWithMemoCount[] | null;
      error: string | null;
    };
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

  return (
    <div className="space-y-6">
      {/* 学年・クラス選択 */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-md border bg-muted/30">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">学年</label>
          <select
            className="px-3 py-1.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={grade ?? ""}
            onChange={(e) =>
              setGrade(e.target.value === "" ? null : Number(e.target.value))
            }
          >
            <option value="">指定なし</option>
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
            value={classNum ?? ""}
            onChange={(e) =>
              setClassNum(e.target.value === "" ? null : Number(e.target.value))
            }
          >
            <option value="">指定なし</option>
            {CLASSES.map((c) => (
              <option key={c} value={c}>
                {c}組
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleLoad}
          disabled={!canLoad || loadingStudents}
          className="px-4 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          読み込む
        </button>
      </div>

      {/* 読み込み中 */}
      {loadingStudents && (
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      )}

      {/* 生徒カード一覧 */}
      {students !== null && !loadingStudents && (
        <>
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              該当する生徒が見つかりませんでした。
            </p>
          ) : (
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
                            <div
                              key={memo.id}
                              className="rounded-md border bg-muted/20 p-3"
                            >
                              <div className="text-xs text-muted-foreground mb-2">
                                {new Date(memo.created_at).toLocaleString(
                                  "ja-JP"
                                )}
                                {memo.timestamp_seconds !== null && (
                                  <span className="ml-2">
                                    ▶{" "}
                                    {Math.floor(memo.timestamp_seconds / 60)}:
                                    {String(
                                      memo.timestamp_seconds % 60
                                    ).padStart(2, "0")}
                                  </span>
                                )}
                              </div>
                              <RichContent
                                content={
                                  memo.content as Record<string, unknown>
                                }
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {students === null && !loadingStudents && (
        <p className="text-sm text-muted-foreground">
          学年またはクラスを指定して「読み込む」を押してください。
        </p>
      )}
    </div>
  );
}
