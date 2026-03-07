"use client";

import { useState } from "react";
import type { Memo, TiptapContent } from "@/lib/mock-data";

type Props = {
  lessonId: string;
  initialMemos: Memo[];
  initialPostedMemoIds: string[];
};

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractText(content: TiptapContent): string {
  return content.content
    .flatMap((node) => node.content ?? [])
    .filter((node) => node.type === "text")
    .map((node) => node.text)
    .join("");
}

export default function MemoSection({
  lessonId,
  initialMemos,
  initialPostedMemoIds,
}: Props) {
  const [memo, setMemo] = useState("");
  const [timestamp, setTimestamp] = useState<number | null>(null);
  const [memos, setMemos] = useState<Memo[]>(initialMemos);
  const [postedIds, setPostedIds] = useState<Set<string>>(
    new Set(initialPostedMemoIds)
  );
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");

  const handleTimestamp = () => {
    // 実装時はYouTube Player APIから getCurrentTime() で取得する
    setTimestamp(127); // モック値: 2:07
  };

  const handleSave = () => {
    if (!memo.trim()) return;
    const newMemo: Memo = {
      id: String(Date.now()),
      lesson_id: lessonId,
      user_id: "student-1",
      content: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: memo }] },
        ],
      },
      timestamp_seconds: timestamp,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setMemos((prev) => [newMemo, ...prev]);
    setMemo("");
    setTimestamp(null);
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2000);
  };

  const handlePost = (memoId: string) => {
    setPostedIds((prev) => new Set([...prev, memoId]));
  };

  return (
    <div className="sticky top-20 rounded-md border bg-card p-4 space-y-3 max-h-[calc(100vh-6rem)] overflow-y-auto">
      <h2 className="text-base font-semibold">✏️ メモ</h2>

      {/* 新規メモ入力 */}
      <button
        onClick={handleTimestamp}
        className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors w-full justify-center"
      >
        ⏱️ タイムスタンプを記録
      </button>

      {timestamp !== null && (
        <p className="text-xs text-muted-foreground">
          📍 {formatTimestamp(timestamp)} からのメモ
        </p>
      )}

      <textarea
        className="w-full min-h-[120px] p-3 text-sm rounded-md border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="動画を見て気づいたことや疑問をメモしよう..."
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
      />

      <button
        onClick={handleSave}
        disabled={!memo.trim()}
        className="w-full py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saveState === "saved" ? "✅ 保存しました！" : "保存する"}
      </button>

      {/* 過去のメモ タイムライン */}
      {memos.length > 0 && (
        <div className="pt-1 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            過去のメモ
          </p>
          <div className="space-y-2">
            {memos.map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-md border bg-background space-y-1.5"
              >
                <p className="text-xs text-muted-foreground">
                  {m.timestamp_seconds !== null
                    ? `📍 ${formatTimestamp(m.timestamp_seconds)} ・ `
                    : ""}
                  {formatDate(m.created_at)}
                </p>
                <p className="text-sm leading-relaxed">
                  {extractText(m.content)}
                </p>
                {postedIds.has(m.id) ? (
                  <p className="text-xs text-muted-foreground">投稿済み ✅</p>
                ) : (
                  <button
                    onClick={() => handlePost(m.id)}
                    className="text-xs px-2 py-1 rounded-md border hover:bg-muted transition-colors"
                  >
                    クラスに投稿
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
