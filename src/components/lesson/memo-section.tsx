"use client";

import { useState } from "react";
import { Clock } from "lucide-react";

type Props = {
  lessonId: string;
};

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function MemoSection({ lessonId: _lessonId }: Props) {
  const [memo, setMemo] = useState("");
  const [timestamp, setTimestamp] = useState<number | null>(null);
  const [savedState, setSavedState] = useState<"idle" | "saved" | "posted">(
    "idle"
  );

  const handleTimestamp = () => {
    // 実装時はYouTube Player APIから getCurrentTime() で取得する
    setTimestamp(127); // モック値: 2:07
  };

  const handleSave = () => {
    setSavedState("saved");
    setTimeout(() => setSavedState("idle"), 2000);
  };

  const handlePost = () => {
    setSavedState("posted");
    setTimeout(() => setSavedState("idle"), 2000);
  };

  return (
    <div className="sticky top-20 rounded-lg border bg-card p-4 space-y-3">
      <h2 className="text-base font-semibold">メモ</h2>

      <button
        onClick={handleTimestamp}
        className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors w-full justify-center"
      >
        <Clock size={14} />
        タイムスタンプを記録
      </button>

      {timestamp !== null && (
        <p className="text-xs text-muted-foreground">
          📍 {formatTimestamp(timestamp)} からのメモ
        </p>
      )}

      <textarea
        className="w-full min-h-[200px] p-3 text-sm rounded-md border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="動画を見て気づいたことや疑問をメモしよう..."
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
      />

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          {savedState === "saved" ? "保存しました！" : "保存する"}
        </button>
        <button
          onClick={handlePost}
          className="flex-1 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
        >
          {savedState === "posted" ? "投稿しました！" : "クラスに投稿"}
        </button>
      </div>
    </div>
  );
}
