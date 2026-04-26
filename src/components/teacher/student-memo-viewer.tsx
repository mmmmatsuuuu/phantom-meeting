"use client";

import { useState } from "react";
import RichContent from "@/components/shared/rich-content";
import type { StudentWithMemoCount, Memo } from "@/lib/db/memos";

type Props = { lessonId: string };

const GRADES = [1, 2, 3];
const CLASSES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function StudentMemoViewer({ lessonId }: Props) {
  const [grade, setGrade] = useState<number | null>(null);
  const [classNum, setClassNum] = useState<number | null>(null);
  const [students, setStudents] = useState<StudentWithMemoCount[] | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [memosByUser, setMemosByUser] = useState<Record<string, Memo[]>>({});
  const [loadingMemoUserId, setLoadingMemoUserId] = useState<string | null>(null);

  const canLoad = grade !== null || classNum !== null;

  const handleLoad = async () => {
    if (!canLoad) return;
    setStudents(null);
    setExpandedUserId(null);
    setMemosByUser({});
    setLoadingStudents(true);
    const params = new URLSearchParams();
    if (grade !== null) params.set("grade", String(grade));
    if (classNum !== null) params.set("class", String(classNum));
    const res = await fetch(
      `/api/teacher/lessons/${lessonId}/memo-students?${params.toString()}`
    );
    const json = (await res.json()) as { data: StudentWithMemoCount[] | null; error: string | null };
    setStudents(json.data ?? []);
    setLoadingStudents(false);
  };

  const handleToggleStudent = async (userId: string, memoCount: number) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(userId);
    if (memosByUser[userId] || memoCount === 0) return;

    setLoadingMemoUserId(userId);
    const res = await fetch(
      `/api/teacher/lessons/${lessonId}/memo-students/${userId}`
    );
    const json = (await res.json()) as { data: Memo[] | null; error: string | null };
    setMemosByUser((prev) => ({ ...prev, [userId]: json.data ?? [] }));
    setLoadingMemoUserId(null);
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
            onChange={(e) => setGrade(e.target.value === "" ? null : Number(e.target.value))}
          >
            <option value="">指定なし</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>{g}年</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">クラス</label>
          <select
            className="px-3 py-1.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={classNum ?? ""}
            onChange={(e) => setClassNum(e.target.value === "" ? null : Number(e.target.value))}
          >
            <option value="">指定なし</option>
            {CLASSES.map((c) => (
              <option key={c} value={c}>{c}組</option>
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

      {/* 生徒一覧 */}
      {loadingStudents && (
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      )}

      {students !== null && !loadingStudents && (
        <>
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              該当する生徒が見つかりませんでした。
            </p>
          ) : (
            <div className="rounded-md border divide-y">
              {students.map((student) => (
                <div key={student.id}>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                    onClick={() => handleToggleStudent(student.id, student.memo_count)}
                  >
                    <span className="text-xs text-muted-foreground w-12 shrink-0">
                      {student.student_number ?? "—"}
                    </span>
                    <span className="flex-1 text-sm font-medium">{student.display_name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      メモ {student.memo_count} 件
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {expandedUserId === student.id ? "▲" : "▼"}
                    </span>
                  </button>

                  {expandedUserId === student.id && (
                    <div className="px-4 pb-4 bg-muted/10 border-t">
                      {loadingMemoUserId === student.id ? (
                        <p className="text-sm text-muted-foreground py-3">読み込み中...</p>
                      ) : student.memo_count === 0 ? (
                        <p className="text-sm text-muted-foreground py-3">メモはありません。</p>
                      ) : (
                        <div className="space-y-3 pt-3">
                          {(memosByUser[student.id] ?? []).map((memo) => (
                            <div key={memo.id} className="rounded-md border bg-background p-3">
                              <div className="text-xs text-muted-foreground mb-2">
                                {new Date(memo.created_at).toLocaleString("ja-JP")}
                                {memo.timestamp_seconds !== null && (
                                  <span className="ml-2">
                                    動画 {Math.floor(memo.timestamp_seconds / 60)}:{String(memo.timestamp_seconds % 60).padStart(2, "0")}
                                  </span>
                                )}
                              </div>
                              <RichContent content={memo.content as Record<string, unknown>} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
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
