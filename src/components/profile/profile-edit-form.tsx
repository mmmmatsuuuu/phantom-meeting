"use client";

import { useState } from "react";
import { toast } from "sonner";

type Props = {
  initialDisplayName: string;
  initialStudentNumber: number | null;
  initialNote: string | null;
  targetUserId?: string; // teacher/admin が他ユーザーを編集する場合に指定
};

export default function ProfileEditForm({
  initialDisplayName,
  initialStudentNumber,
  initialNote,
  targetUserId,
}: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [studentNumber, setStudentNumber] = useState(
    initialStudentNumber !== null ? String(initialStudentNumber) : ""
  );
  const [note, setNote] = useState(initialNote ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("表示名を入力してください");
      return;
    }

    const studentNumberParsed = studentNumber.trim()
      ? parseInt(studentNumber.trim(), 10)
      : null;

    if (studentNumber.trim() && isNaN(studentNumberParsed!)) {
      toast.error("学籍番号は数字で入力してください");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(targetUserId ? { targetUserId } : {}),
        displayName: displayName.trim(),
        studentNumber: studentNumberParsed,
        note: note.trim() || null,
      }),
    });
    setSaving(false);

    if (res.ok) {
      toast.success("プロフィールを保存しました");
    } else {
      toast.error("保存に失敗しました");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1">
        <label className="text-sm font-medium">表示名</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="表示名を入力"
          className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">学籍番号</label>
        <input
          type="text"
          inputMode="numeric"
          value={studentNumber}
          onChange={(e) => setStudentNumber(e.target.value)}
          placeholder="例: 12345"
          className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground">数字のみ入力してください</p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">備考</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="自由記述（省略可）"
          rows={3}
          className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? "保存中..." : "保存する"}
      </button>
    </form>
  );
}
