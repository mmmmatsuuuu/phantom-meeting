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

  const handleSearch = async (g: number, c: number) => {
    setStudents(null);
    setExpandedUserId(null);
    setMemosByUser({});
    setLoadingStudents(true);
    const res = await fetch(
      `/api/teacher/lessons/${lessonId}/memo-students?grade=${g}&class=${c}`
    );
    const json = (await res.json()) as { data: StudentWithMemoCount[] | null; error: string | null };
    setStudents(json.data ?? []);
    setLoadingStudents(false);
  };

  const handleGradeChange = (value: number) => {
    setGrade(value);
    if (classNum !== null) handleSearch(value, classNum);
  };

  const handleClassChange = (value: number) => {
    setClassNum(value);
    if (grade !== null) handleSearch(grade, value);
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
      <div className="flex items-center gap-4 p-4 rounded-md border bg-muted/30">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">学年</label>
          <select
            className="px-3 py-1.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={grade ?? ""}
            onChange={(e) => handleGradeChange(Number(e.target.value))}
          >
            <option value="" disabled>選択</option>
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
            onChange={(e) => handleClassChange(Number(e.target.value))}
          >
            <option value="" disabled>選択</option>
            {CLASSES.map((c) => (
              <option key={c} value={c}>{c}組</option>
            ))}
          </select>
        </div>
        {grade !== null && classNum !== null && (
          <span className="text-sm text-muted-foreground">
            {grade}年{classNum}組
          </span>
        )}
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
        <p className="text-sm text-muted-foreground">学年とクラスを選択してください。</p>
      )}
    </div>
  );
}
